// Import the feature collection of U.S. states
var states = ee.FeatureCollection("TIGER/2018/States");

// Define the list of northeastern states
var northeasternStates = ['Maine', 'New Hampshire', 'Vermont', 
                          'Massachusetts', 'Rhode Island',
                          'Connecticut', 'New York'];

// Filter the states to include only the northeastern states as the area of interest (AOI)
var aoi = states.filter(ee.Filter.inList('NAME', northeasternStates));

// Import the ESA WorldCover dataset for 2020
var worldCover = ee.Image("ESA/WorldCover/v100/2020");

// Define land cover class values for water bodies and built-up areas
var waterClass = 80;    // Class value for water bodies
var builtUpClass = 50;  // Class value for built-up areas

// Create masks for water bodies and built-up areas
var waterMask = worldCover.eq(waterClass);
var builtUpMask = worldCover.eq(builtUpClass);

// Combine the masks to exclude both water bodies and built-up areas
var combinedMask = waterMask.or(builtUpMask);

// Import the GEDI Level 2A dataset and filter it to the AOI
var gediL2A = ee.FeatureCollection("LARSE/GEDI/GEDI02_A_002_INDEX")
                .filterBounds(aoi);

// Function to extract 'table_id' property from each GEDI feature
function extractProperty(feature) {
  return ee.Feature(null, {'table_id': feature.get('table_id')});
}

// Create a list of GEDI table IDs for further filtering
var gediIdList = gediL2A.map(extractProperty).aggregate_array('table_id');

// Define filters based on GEDI quality, degradation, and sensitivity attributes
var qualityFilter = ee.Filter.eq('quality_flag', 1);       // High-quality data only
var degradeFilter = ee.Filter.eq('degrade_flag', 0);       // Exclude degraded measurements
var sensitivityFilter = ee.Filter.gt('sensitivity', 0.98); // High sensitivity
var nightFilter = ee.Filter.lte('solar_elevation', 0);     // Exclude morning shots

// Function to apply land cover mask to GEDI points
function maskGEDIPoints(feature) {
  // Get point geometry of GEDI feature
  var point = feature.geometry();
  
  // Sample the combined land cover mask at GEDI point location
  var maskValue = combinedMask.reduceRegion({
    reducer: ee.Reducer.first(),
    geometry: point,
    scale: 10
  }).values().get(0);
  
  // Return feature only if the point is not water or built-up area
  return feature.set('mask', maskValue);
}

// Initialize an empty list to store filtered GEDI data collections
var collectedData = [];

// Iterate through GEDI table IDs, applying date filters and masking
gediIdList.getInfo().forEach(function(id) {
  // Parse date from the table ID format
  var date = ee.Date.parse('YYYYDDD', id.slice(33, 40));   
  
  // Filter by year and month (June - October of 2022)
  if (date.get('year').getInfo() === 2022 && 
      (date.get('month').getInfo() >= 6 && date.get('month').getInfo() <= 10)) {

    // Apply quality, degradation, sensitivity, and land cover filters
    var filteredData = ee.FeatureCollection(id)
                        .filterBounds(aoi)
                        .filter(qualityFilter)
                        .filter(degradeFilter)
                        .filter(sensitivityFilter)
                        .filter(nightFilter)
                        .map(maskGEDIPoints)
                        .filter(ee.Filter.eq('mask', 0)) // Retain features not on water or built-up areas
                        .map(function(feature) {
                          return feature.set('date', date.format('YYYY-MM-dd')); // Add formatted date
                        });
                        
    // Add filtered collection to collectedData list
    collectedData.push(filteredData);
  }
});

// Merge all collections into a single FeatureCollection
var gediCollection = ee.FeatureCollection(collectedData).flatten();

// Select the canopy height (RH95) and date properties for export
var gediRH95 = gediCollection.select('rh95', 'date');

// Export the filtered GEDI dataset to Google Earth Engine asset
Export.table.toAsset({
  collection: gediRH95, 
  description: 'GEDI_rh95_2022', 
  assetId: 'GEDI_rh95_2022'
});
