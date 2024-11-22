// Load GEDI RH95 data points for the area of interest
var Gedi = ee.FeatureCollection('projects/ee-gh41th/assets/GEDI_rh95_2022');

// Define the target projection for resampling and buffer calculations
var targetProjection = ee.Projection('EPSG:5070');

// Function to extract Sentinel-1 VV and VH polarization values for each GEDI point
function extractS1Values(gediPoint) {
  // Define a buffer around the GEDI point and a 30-day window centered on the GEDI date
  var buffer = gediPoint.geometry().transform(targetProjection, 25).buffer(12.5);
  var date = ee.Date(gediPoint.get('date'));
  var startDate = date.advance(-15, 'day');
  var endDate = date.advance(15, 'day');

  // Filter Sentinel-1 collection by date, polarization, and instrument mode
  var sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterDate(startDate, endDate)
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))  // VV polarization
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))  // VH polarization
    .filter(ee.Filter.eq('instrumentMode', 'IW'));  // Interferometric Wide swath mode
  
  // Separate ascending and descending orbit images into distinct collections
  var vvVhIwAsc = sentinel1.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
  var vvVhIwDesc = sentinel1.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));

  // Calculate median VV and VH values for combined ascending and descending orbits
  var VV = vvVhIwAsc.merge(vvVhIwDesc).select('VV').median();
  var VH = vvVhIwAsc.merge(vvVhIwDesc).select('VH').median();

  // Extract mean VV and VH values within the buffer area
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

  // Attach VH and VV mean values to the GEDI point as properties
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
    description: 'Sentinel-1_batch_' + (i+1),
    fileFormat: 'CSV'
  });
}