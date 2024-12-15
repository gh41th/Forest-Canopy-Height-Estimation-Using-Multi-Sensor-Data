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
Here is a **Markdown** version of the `README` file that fits your repository structure and requirements.


## **Repository Structure**

The repository is structured as follows:

```plaintext
├── Download and Preprocess/
│   ├── 3DEP.js                       # Extracts 3DEP data (elevation, slope)
│   ├── Download-aoi-to_predict.js    # Downloads AOI for prediction
│   ├── FIA_Plots.js                  # Extracts FIA perturbed plot locations
│   ├── Gedi.js                       # Extracts GEDI RH95 points
│   ├── Sentinel-1-month-approach.js  # Sentinel-1 (1-month window)
│   ├── Sentinel-1-overall-median.js  # Sentinel-1 (overall median)
│   ├── Sentinel-2-month-approach.js  # Sentinel-2 (1-month window)
│   ├── Sentinel-2-overall-median.js  # Sentinel-2 (overall median)
│   └── data_join.ipynb               # Combines preprocessed data
│
├── Models/
│   └── (trained models)
│
├── Results/         
│   └── (tables, figures, maps)      # Outputs from model predictions
│
│
│── Model_Cross_Validation.ipynb             # Cross-validation workflow
│── Models_Hyperparameters_Finetuning.ipynb  # Hyperparameter optimization
├── Results_Plots.ipynb                      # Script for generating result plots
├── FIA_Plots.ipynb                          # Downloads FIA data and plots
├── Predict_FIA_Plots.ipynb                  # Predicts canopy height on FIA plots
├── README.md                                # Project documentation
└── requirements.txt                         # List of required libraries
```

## **Technical Requirements**

### **Prerequisites**

To reproduce the project, ensure you have access to the following tools and platforms:
1. **Google Earth Engine (GEE):** For running JavaScript scripts.
2. **Google Colab:** For running Jupyter Notebooks.

### **Libraries**

The following Python libraries are required:
- `pandas`
- `numpy`
- `geopandas`
- `rasterio`
- `sklearn`
- `matplotlib`
- `seaborn`

You can install the required libraries using:

```bash
pip install -r requirements.txt
```

### **Hardware Requirements**

- 15 GB storage on google drive/local  
- RAM equal or higher than Google Colab RAM should be 

## **How to Use**

### **1. Data Download and Preprocessing**
Run the **JavaScript scripts** in **Google Earth Engine** to extract datasets:

- GEDI points extraction: `Gedi.js`
- Sentinel-1/2 data (use either approach):  
   - `Sentinel-1-month-approach.js` or `Sentinel-1-overall-median-approach.js`  
   - `Sentinel-2-month-approach.js` or `Sentinel-2-overall-median-approach.js`  
- 3DEP elevation data: `3DEP.js`  
- Combine all features: `data_join.ipynb`

**Output:** A processed dataframe ready for model training.

### **2. Model Training and Evaluation**

- **Hyperparameter Tuning:** Run `Models_Hyperparameters_Finetuning.ipynb` to perform grid search for:  
   - Random Forest, AdaBoost, CatBoost, XGBoost  
- **Cross-Validation:** Use `Model_Cross_Validation.ipynb` to evaluate model performance and generalization.

### **3. Predicting on FIA Plots**

1. Extract FIA plot locations using `FIA_Plots.js` and save as a shapefile.  
2. Download FIA data in Google Earth Engine.  
3. Run `Predict_FIA_Plots.ipynb` to generate predictions for FIA plots.

### **4. Results and Visualization**

- Use `Results_Plots.ipynb` to generate maps, tables, and plots of predicted canopy heights and model performance.


## **Reproducibility**

1. **Setup Environment:**  
   - Install required libraries (`requirements.txt`).  
   - Access Google Earth Engine with proper credentials.

2. **Run Scripts in Sequence:**  
   a. **Preprocess Data:** Follow steps in *Data Download and Preprocessing*.  
   b. **Train and Evaluate Models:** Run Jupyter notebooks in `Models` folder.  
   c. **Predict Results:** Execute FIA plot predictions.  

3. **Visualize Outputs:** Analyze results stored in the `Results` folder.


## **License**

This project is licensed under the **MIT License**. See the LICENSE file for details.


## **Contact**

For questions, suggestions, or issues, contact:  
**Name:** Ghaith Kouki 
**Email:** gkouki@esf.com  
**GitHub:** [gh41th](https://github.com/gh41th/)  
