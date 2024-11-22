// Load GEDI RH95 data points for the area of interest
var Gedi = ee.FeatureCollection('projects/ee-gh41th/assets/GEDI_rh95_2022');

// Define target projection and band selection for Sentinel-2 processing
var targetProjection = ee.Projection('EPSG:5070');
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12'];

// Define the Cloud Score+ image collection and cloud masking threshold
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var QA_BAND = 'cs_cdf';
var CLEAR_THRESHOLD = 0.85;  // Threshold for masking clouds

// Function to add vegetation indices to Sentinel-2 images
function addIndices(image) {
  // Calculate common vegetation indices
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  var nbr = image.normalizedDifference(['B8', 'B12']).rename('NBR');
  var ndre = image.normalizedDifference(['B8A', 'B5']).rename('NDRE');
  var ndmi = image.normalizedDifference(['B8', 'B11']).rename('NDMI');
  
  // Calculate Tasseled Cap Greenness using a custom expression
  var greenness = image.expression(
    '0.3909 * B8 - 0.0396 * B4 + 0.1710 * B3 + 0.4574 * B2',
    {'B8': image.select('B8'), 'B4': image.select('B4'), 'B3': image.select('B3'), 'B2': image.select('B2')}
  ).rename('TasseledCapGreenness');
  
  // Add the indices as new bands to the image
  return image.addBands([ndvi, nbr, ndre, ndmi, greenness]);
}

// Function to prepare Sentinel-2 images with bicubic resampling to 10 m and scaling to [0, 1]
function prepareImage(image) {
  var selectedImage = image.select(bands).divide(10000);  // Scale to [0, 1]
  return selectedImage.reproject({
    crs: targetProjection,
    scale: 25
  });
}

// Function to extract Sentinel-2 values for each GEDI point
function extractS2Values(gediPoint) {
  // Define a buffer around the GEDI point and a 30-day window for Sentinel-2 data
  var buffer = gediPoint.geometry().transform(targetProjection, 10).buffer(12.5);
  var date = ee.Date(gediPoint.get('date'));
  var startDate = date.advance(-15, 'day');
  var endDate = date.advance(15, 'day');

  // Filter Sentinel-2 collection by date, location, and cloud cover
  var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(startDate, endDate)
    .filterBounds(buffer)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .linkCollection(csPlus, [QA_BAND])  // Link with Cloud Score+ for cloud masking
    .map(function(img) {
      return img.updateMask(img.select(QA_BAND).gte(CLEAR_THRESHOLD));  // Apply cloud mask
    })
    .map(prepareImage)  // Scale and resample images
    .map(addIndices);   // Add vegetation indices

  // Calculate mean values of the selected bands within the buffer
  var meanValues = sentinel2.median().reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: buffer,
    scale: 25
  });

  // Attach Sentinel-2 mean values to the GEDI point as properties
  return gediPoint.set('sentinel', meanValues);
}

// Function to flatten nested properties for simplified export
function flattenProperties(feature) {
  var sentinelProperties = ee.Dictionary(feature.get('sentinel'));
  var newProperties = sentinelProperties.set('rh95', feature.get('rh95'));
  return ee.Feature(feature.geometry(), newProperties);
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
  // Map over each GEDI point to extract Sentinel-2 values and flatten properties
  batch = batch.map(extractS2Values).map(flattenProperties);
  // Export the batch to Google Drive in CSV format
  Export.table.toDrive({
    collection: batch,
    folder: 'Data',
    description: 'Sentinel-2_batch_' + (i+1),
    fileFormat: 'CSV'
  });
}