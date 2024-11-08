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


## Files and Scripts

### Scripts

1. **GEDI Points Extraction Script**: 
   - This script extracts the `rh95` values (canopy height) and coordinates of GEDI points. These points are then used to match with Sentinel-1 and Sentinel-2 data based on the geographic coordinates.

2. **Sentinel-1 Data Extraction Scripts**: 
   - The one month aproach.
   - The overall median approach

3. **Sentinel-2 Data Extraction Scripts**: 
   - The one month aproach.
   - The overall median approach

4. **3DEP Data Extraction Script**: 
   - Extracts elevation and slope data from the 3DEP dataset.

5. **Data Joining Script**: 
   - Combines the extracted features from all datasets into a final dataframe for analysis. This script matches GEDI coordinates with satellite data from both Sentinel-1 and Sentinel-2 using the two approaches described above.
