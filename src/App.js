import React, { useEffect, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Icon, Style } from 'ol/style';

function App() {
  const [trainData, setTrainData] = useState([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Fetch data every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('https://api.tfl.gov.uk/Line/dlr/Arrivals');
      const data = await response.json();
      const formattedData = formatTimestamp(data);
      setTrainData(formattedData);
    } catch (error) {
      console.log(error);
    }
  };

  const formatTimestamp = (data) => {
    return data.map((train) => ({
      id: train.id,
      stationName: train.stationName,
      direction: train.direction,
      platformName: train.platformName,
      destinationName: train.destinationName,
      timestamp: new Date(train.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      timeToStation: train.timeToStation,
      expectedArrival: train.expectedArrival,
    }));
  };

  useEffect(() => {
    const map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat([-0.1276, 51.5074]), // London coordinates
        zoom: 10,
      }),
    });

    const trainLayer = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        image: new Icon({
          src: 'https://github.com/dracos/underground-live-map/blob/master/i/pacmanS.png?raw=true',
          scale: 0.5,
        }),
      }),
    });

    map.addLayer(trainLayer);

    const updateTrainLocations = () => {
      const features = trainData.map((train) => {
        const coordinates = calculateCoordinates(train);
        return new Feature({
          geometry: new Point(coordinates),
        });
      });

      trainLayer.getSource().clear();
      trainLayer.getSource().addFeatures(features);
    };

    const calculateCoordinates = (train) => {
      const timeToStationInSeconds = train.timeToStation;
      const speed = 1000 / 3600; // Assume trains travel at 1000 m/s
      const distance = speed * timeToStationInSeconds;
      const lineDistance = 10000; // Distance between each line point (adjust as needed)
      const directionMultiplier = train.direction === 'inbound' ? 1 : -1;
      const coordinates = [0, 0]; // Starting coordinates

      if (train.destinationName === 'Stratford') {
        coordinates[0] = 0; // Set X-coordinate for Stratford
        coordinates[1] = distance * directionMultiplier; // Set Y-coordinate based on distance and direction
      } else if (train.destinationName === 'Lewisham') {
        coordinates[0] = lineDistance; // Set X-coordinate for Lewisham
        coordinates[1] = distance * directionMultiplier; // Set Y-coordinate based on distance and direction
      }

      return coordinates;
    };

    updateTrainLocations();
  }, [trainData]);

  return <div id="map" style={{ width: '100%', height: '500px' }}></div>;
}

export default App;