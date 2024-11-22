// Load GEDI RH95 data points for the area of interest
var Gedi = ee.FeatureCollection('projects/ee-gh41th/assets/GEDI_rh95_2022');

// Import the feature collection of U.S. states
var states = ee.FeatureCollection("TIGER/2018/States");

// Define the list of northeastern states
var northeasternStates = ['Maine', 'New Hampshire', 'Vermont', 
                          'Massachusetts', 'Rhode Island',
                          'Connecticut', 'New York'];

// Filter the states to include only the northeastern states as the area of interest (AOI)
var aoi = states.filter(ee.Filter.inList('NAME', northeasternStates));

// Define the target projection for resampling and buffer calculations
var targetProjection = ee.Projection('EPSG:5070');

// Prepare Sentinel-1 image collection over the entire study period
var sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterDate('2022-06-01', '2022-10-31')
  .filterBounds(aoi)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .filter(ee.Filter.eq('instrumentMode', 'IW'));

// Separate ascending and descending orbits, then calculate the overall median
var vvVhIwAsc = sentinel1.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
var vvVhIwDesc = sentinel1.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));

var VV = vvVhIwAsc.merge(vvVhIwDesc).select('VV').median();
var VH = vvVhIwAsc.merge(vvVhIwDesc).select('VH').median();

// Function to extract Sentinel-1 median values for GEDI points
function extractS1MedianValues(gediPoint) {
  var buffer = gediPoint.geometry().transform(targetProjection, 25).buffer(12.5);

  // Extract mean VV and VH values within the buffer region around each GEDI point
  var VVp = VV.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: buffer,
    scale: 25
  });
  var VHp = VH.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: buffer,
    scale: 25
  });

  return gediPoint.set('VH', VHp.get('VH')).set('VV', VVp.get('VV'));
}

// Calculate the total size of the GEDI collection
var totalFeatures = Gedi.size();

// Define batch size for processing to manage computational load
var batchSize = totalFeatures.divide(3).floor(); // Divide into 3 batches (adjust as needed)

// Batch processing: split the GEDI data into smaller batches for computational efficiency
// This approach helps prevent exceeding memory and processing limitations in Earth Engine
for (var i = 0; i < 3; i++) {
  var start = batchSize.multiply(i);
  var end = (i === 2) ? totalFeatures.subtract(start) : batchSize;
  var batch = Gedi.toList(end, start); 
  batch=ee.FeatureCollection(batch)
  // Map over each GEDI point to extract Sentinel-1 values 
  batch = batch.map(extractS1Values);
  // Export the batch to Google Drive in CSV format
  Export.table.toDrive({
    collection: batch,
    folder: 'Data',
    description: 'Sentinel-1_Overall_Median_batch_' + (i+1),
    fileFormat: 'CSV'
  });
}

