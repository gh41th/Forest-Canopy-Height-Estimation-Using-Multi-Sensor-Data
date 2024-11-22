var aoi = ee.FeatureCollection('projects/ee-gh41th/assets/FIA_Plots');

var scale=25;

// Load the ESA WorldCover 2020 map
var worldCover = ee.Image('ESA/WorldCover/v100/2020');

// Define the land cover class values for water bodies and built-up areas
var waterClass = 80;  // Water bodies class value
var builtUpClass = 50;  // Built-up areas class value

// Create masks for water bodies and built-up areas
var waterMask = worldCover.neq(waterClass);
var builtUpMask = worldCover.neq(builtUpClass);

// Combine the masks to exclude both water bodies and built-up areas
var combinedMask = waterMask.and(builtUpMask);

// Load our saved classifier.
var regression = ee.Classifier.load('projects/ee-gh41th/assets/RF_2022_median');

// Define target projection and band selection for Sentinel-2
var targetProjection = ee.Projection('EPSG:5070');
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12'];

// Cloud Score+ image collection
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');

// Use 'cs' or 'cs_cdf', depending on your use case; see docs for guidance.
var QA_BAND = 'cs_cdf';

// The threshold for masking; values between 0.50 and 0.65 generally work well.
// Higher values will remove thin clouds, haze & cirrus shadows.
var CLEAR_THRESHOLD = 0.85;

// Function to add vegetation indices to the image
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

// Function to prepare Sentinel-2 images with bicubic resampling to 10 m
function prepareImage(image) {
  var selectedImage = image.select(bands).divide(10000);
  return selectedImage.reproject({
    crs: targetProjection,
    scale: scale
  });
}

// Setup Sentinel-2 collection filters for June
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterDate('2022-06-01', '2022-10-31')
                .filterBounds(roi)
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                .linkCollection(csPlus, [QA_BAND])
                .map(function(img) {
                  return img.updateMask(img.select(QA_BAND).gte(CLEAR_THRESHOLD));
                })
                .median()
                .updateMask(combinedMask)
                .clip(aoi);

// Sentinel-2 visualization parameters
var s2Viz = {bands: ['B4', 'B3', 'B2'], min: 0, max: 2500};

Map.addLayer(sentinel2, s2Viz, 'median composite');
Map.centerObject(roi, 7);

sentinel2 = addIndices(prepareImage(sentinel2));
var sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD')
        .filterDate('2022-06-01', '2022-10-31')
        // Filter to get images with VV and VH dual polarization.
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
        // Filter to get images collected in interferometric wide swath mode.
        .filter(ee.Filter.eq('instrumentMode', 'IW'));
        // Separate ascending and descending orbit images into distinct collections.
var vvVhIwAsc = sentinel1.filter(
        ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
var vvVhIwDesc = sentinel1.filter(
        ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));
        
// Mean VV for combined ascending and descending image collections.
var VV = vvVhIwAsc.merge(vvVhIwDesc).select('VV').median()
                                    .reproject({crs: sentinel2.projection(), scale: scale});
// Mean VH for combined ascending and descending image collections.
var VH = vvVhIwAsc.merge(vvVhIwDesc).select('VH').median()
                                     .reproject({crs: sentinel2.projection(), scale: scale});



// Load DEM and reproject it
var dem = ee.Image('USGS/3DEP/10m')
      .reproject({crs: sentinel2.projection(), scale: scale})
      .toFloat()  
      .clip(aoi);
var slope = ee.Terrain.slope(dem);




var image = sentinel2.addBands([dem,slope,VV,VH]).toFloat().clip(aoi);



// Export the image to Google Drive
Export.image.toDrive({
    image: image,  
    description: 'FIA_PLots',
    folder: 'DATA',
    shardSize: 512, 
    fileDimensions: [2048, 2048],
    fileFormat: 'GeoTIFF',
    scale: scale,
    formatOptions: {
      cloudOptimized: true
    },
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
