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

// Define the target projection and Sentinel-2 bands of interest
var targetProjection = ee.Projection('EPSG:5070');
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12'];

// Define the Cloud Score+ image collection and cloud masking threshold
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var QA_BAND = 'cs_cdf';
var CLEAR_THRESHOLD = 0.85;  // Threshold for masking clouds

// Function to add vegetation indices to each Sentinel-2 image
function addIndices(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  var nbr = image.normalizedDifference(['B8', 'B12']).rename('NBR');
  var ndre = image.normalizedDifference(['B8A', 'B5']).rename('NDRE');
  var ndmi = image.normalizedDifference(['B8', 'B11']).rename('NDMI');
  var greenness = image.expression(
    '0.3909 * B8 - 0.0396 * B4 + 0.1710 * B3 + 0.4574 * B2',
    {'B8': image.select('B8'), 'B4': image.select('B4'), 'B3': image.select('B3'), 'B2': image.select('B2')}
  ).rename('TasseledCapGreenness');
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

// Prepare Sentinel-2 image collection over the entire study period
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate('2022-06-01', '2022-10-31')
  .filterBounds(aoi)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .linkCollection(csPlus, [QA_BAND])  // Link with Cloud Score+ for cloud masking
  .map(function(img) {
    return img.updateMask(img.select(QA_BAND).gte(CLEAR_THRESHOLD));  // Apply cloud mask
  })
  .map(prepareImage)  // Scale and resample images
  .map(addIndices)  // Add Indices
  .median();  // Calculate overall median for the study period

// Function to extract Sentinel-2 median values for GEDI points
function extractS2MedianValues(gediPoint) {
  var buffer = gediPoint.geometry().transform(targetProjection, 10).buffer(12.5);

  // Reduce median Sentinel-2 image within the buffer region around each GEDI point
  var meanValues = sentinel2.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: buffer,
    scale: 25
  });

  return gediPoint.set('sentinel', meanValues);
}

// Flatten the extracted properties for each GEDI point
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
for (var i = 1; i < 4; i++) {
  // Define the start and end index for the batch
  var start = ee.Number(batchSize).multiply(i);
  var end = (i === 3) ? totalFeatures.subtract(start) : batchSize;
  
  // Slice the GEDI collection to get the current batch
  var batch = ee.FeatureCollection(Gedi.toList(start, end));

  // Map over each GEDI point to extract Sentinel-2 values and flatten properties
  batch = batch.map(extractS2MedianValues).map(flattenProperties);

  // Export the batch to Google Drive in CSV format
  Export.table.toDrive({
    collection: batch,
    folder: 'Data',
    description: 'Sentinel-2_Overall_Median_batch_' + i,
    fileFormat: 'CSV'
  });
}