// Load the 10m resolution 3DEP DEM dataset
var dem = ee.Image('USGS/3DEP/10m');

// Load the GEDI RH95 dataset
var Gedi = ee.FeatureCollection('projects/ee-gh41th/assets/GEDI_rh95_2022');

// Define the target projection for reprojecting the DEM data
var targetProjection = ee.Projection('EPSG:5070');

// Reproject the DEM data to the target projection
dem = dem.reproject(targetProjection);

// Calculate the slope from the DEM (terrain) image
var slope = ee.Terrain.slope(dem).rename('Slope');

// Function to extract the mean elevation and slope for each GEDI point
function extractDEM(gediPoint) {
  // Create a buffer around each GEDI point geometry (12.5 meters)
  var buffer = gediPoint.geometry().transform(targetProjection).buffer(12.5);
  
  // Calculate the mean elevation within the buffer
  var elevation = dem.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: buffer,
    scale: 25  // Scale for 3DEP data (in meters)
  });
  
  // Calculate the mean slope within the buffer
  var slp = slope.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: buffer,
    scale: 25  // Scale for 3DEP data (in meters)
  });
  
  // Return the original GEDI point with added properties for elevation and slope
  return gediPoint.set('elevation', elevation.get('elevation'))
                  .set('slope', slp.get('Slope'));
}

// Apply the extractDEM function to all GEDI points
var dem = Gedi.map(extractDEM);

// Export the results as a CSV to Google Drive
Export.table.toDrive({
  collection: dem,
  folder: 'Data',
  description: '3DEP',  
  fileFormat: 'CSV'  
});
