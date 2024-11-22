# Forest Canopy Height Estimation Using Multi-Sensor Data

## Project Overview

This project aims to estimate forest canopy height in the northeastern United States using a combination of remote sensing datasets, including:
- **GEDI (Global Ecosystem Dynamics Investigation) LiDAR**
- **Sentinel-1 SAR (Synthetic Aperture Radar)**
- **Sentinel-2 Optical Imagery**
- **3DEP Elevation Data**

The goal is to develop a canopy height model (CHM) by integrating these datasets to improve the accuracy of estimating forest structure and biomass.

## Datasets Used

1. **GEDI LiDAR Data** (RH95 for canopy height estimates)
   - Source: NASA GEDI (Global Ecosystem Dynamics Investigation)
   - Product: GEDI L2A (Geolocated Elevation and Height Metrics Product)

2. **Sentinel-1 SAR Data**
   - Source: European Space Agency (ESA) Copernicus
   - Data Used: Dual-polarization (VV and VH) collected in Interferometric Wide Swath mode (IW)

3. **Sentinel-2 Optical Data**
   - Source: European Space Agency (ESA) Copernicus
   - Data Used: Multispectral imagery for vegetation indices

4. **3DEP (Digital Elevation Model)**
   - Source: USGS (United States Geological Survey)
   - Data Used: 10-meter resolution DEM for topographic features (elevation, slope)

## Methodology

1. **Data Preprocessing**
   - **GEDI LiDAR**: Filter and clean GEDI data, specifically using RH95 (95th percentile) as the target canopy height.
   - **Sentinel-1 SAR**: Filter and process Sentinel-1 data for dual-polarization (VV, VH) bands. 
   - **Sentinel-2 Optical**: Extract relevant bands and vegetation indices. 
   - **3DEP DEM**: Reproject the DEM and compute the slope.

2. **Two Approaches for Matching Data**
   - **One-month Window Approach**: Matches satellite data (Sentinel-1 and Sentinel-2) to GEDI points within a ±15-day window. This approach allows for a more specific temporal correlation between the satellite measurements and the GEDI observations.
   - **Overall Median Approach**: Uses the global median value of satellite data available over the entire study period, regardless of the temporal proximity to the GEDI measurement.


## Data Download and Preprocessing

1. **GEDI Points Extraction Script**  
   - This script extracts the `rh95` values (canopy height), dates, and coordinates of GEDI points. These points are then used to match with Sentinel-1 and Sentinel-2 data based on the geographic coordinates.

2. **Sentinel-1 Data Extraction Scripts**  
   - **One-Month Approach**: Extracts Sentinel-1 SAR data for the specific month, matching the data to GEDI points within a ±15-day window.
   - **Overall Median Approach**: Uses the global median value of Sentinel-1 data available over the entire study period, without consideration for temporal proximity to GEDI measurements.

3. **Sentinel-2 Data Extraction Scripts**  
   - **One-Month Approach**: Extracts Sentinel-2 optical data for the specific month, matching the data to GEDI points within a ±15-day window.
   - **Overall Median Approach**: Uses the global median value of Sentinel-2 data available over the entire study period, without consideration for temporal proximity to GEDI measurements.

4. **3DEP Data Extraction Script**  
   - Extracts elevation and slope data from the 3DEP (Digital Elevation Model) dataset to include topographic features for model analysis.

5. **Data Joining Script**  
   - Combines the extracted features from all datasets (GEDI, Sentinel-1, Sentinel-2, and 3DEP) into a final dataframe for analysis. This script matches GEDI coordinates with satellite data from both Sentinel-1 and Sentinel-2 using the two matching approaches (one-month and overall median).


## Training and Model Tuning

### Model Hyperparameter Tuning

For model development, we perform a grid search for hyperparameter optimization on four machine learning models:
- **Random Forest**
- **AdaBoost**
- **CatBoost**
- **XGBoost**

The hyperparameter search is conducted using the two data matching approaches described in the data joining process. The grid search is automated and can be found in the script `Model Hyperparameters Tuning.ipynb`.

### Model Training and Cross Validation

Model training is followed by cross-validation to ensure robust model performance and to prevent overfitting. Cross-validation is implemented in the script `Model Cross Validation.ipynb`. This script helps in evaluating the model performance using different subsets of the data, providing an estimate of the model’s generalization capability.

## Validation

### FIA Plot Validation
The Forest Inventory and Analysis (FIA) program provides an incredible resource for forest data through its publicly available database (FIADB). However, due to privacy constraints, FIA doesn't share the exact coordinates of its plots. Instead, they provide perturbed plot coordinates (PPC), which are shifted slightly—usually within ½ mile, and no more than 1 mile—from their actual locations.

Since I can't use the exact plot locations for analysis, the approach I'm taking is to predict results within a ½-mile radius of the provided PPC coordinates. I'll then share these predictions back with FIA so they can validate the results against the true plot data on their end.

The first step in the validation process involves downloading Forest Inventory and Analysis (FIA) plot data to compare the model's predictions with actual forest plot measurements. Since exact plot coordinates are not available, the model predicts canopy height within a ½-mile radius of the perturbed plot locations.

1. **Extract Plot Locations**: The script `FIA Plots.ipynb` retrieves the perturbed plot locations and saves them into a shapefile (.shp).
2. **Download Plot Data**: The shapefile is then loaded into Google Earth Engine (GEE) to download FIA plots Multisensor data. This data extraction happens in the script located in `data/FIA_plots`.
3. **Prediction for FIA Plots**: Finally, the script `Predict_FIA_Plots.ipynb` uses the trained model to make predictions for each of the downloaded FIA plots.
