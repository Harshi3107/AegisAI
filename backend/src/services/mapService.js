import fetch from 'node-fetch';

const extractLocationName = (address = {}) => {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.suburb ||
    address.neighbourhood ||
    address.city_district ||
    address.county ||
    address.state_district ||
    address.state ||
    address.district ||
    ''
  );
};

const extractPlaceLabel = (address = {}, fallbackName = '') => {
  return (
    address.university ||
    address.college ||
    address.amenity ||
    address.campus ||
    address.school ||
    address.building ||
    address.neighbourhood ||
    address.suburb ||
    address.village ||
    address.town ||
    address.city ||
    fallbackName ||
    ''
  );
};

const buildLocationDetails = (city, place) => {
  const cityName = city || place || 'Current Location';
  const placeName = place && place !== cityName ? place : '';

  return {
    city: cityName,
    place: placeName,
    locationName: placeName ? `${cityName} (${placeName})` : cityName
  };
};

export const getCityFromCoordinates = async (lat, lng) => {
  try {
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.MAPBOX_TOKEN}&types=place,locality,neighborhood,district&limit=1`;
    const response = await fetch(mapboxUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch location data (${response.status})`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0].text;
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const nominatimResponse = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'AgesisAI/1.0'
      }
    });

    if (!nominatimResponse.ok) {
      throw new Error('City not found for given coordinates');
    }

    const nominatimData = await nominatimResponse.json();
    const resolvedName = extractLocationName(nominatimData.address);

    if (resolvedName) {
      return resolvedName;
    }

    if (nominatimData.name) {
      return nominatimData.name;
    }

    throw new Error('City not found for given coordinates');
  } catch (error) {
    console.error('Mapbox API error:', error);
    throw new Error('Unable to determine city from coordinates');
  }
};

export const getLocationDetailsFromCoordinates = async (lat, lng) => {
  try {
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.MAPBOX_TOKEN}&types=place,locality,neighborhood,district,address,poi&limit=1`;
    const mapboxResponse = await fetch(mapboxUrl);

    if (mapboxResponse.ok) {
      const mapboxData = await mapboxResponse.json();
      if (mapboxData.features && mapboxData.features.length > 0) {
        const feature = mapboxData.features[0];
        const city = feature.context?.find((item) => item.id?.startsWith('place.'))?.text || feature.text;
        const place = feature.text && feature.text !== city ? feature.text : '';
        return buildLocationDetails(city, place);
      }
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const nominatimResponse = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'AgesisAI/1.0'
      }
    });

    if (!nominatimResponse.ok) {
      return buildLocationDetails('', '');
    }

    const nominatimData = await nominatimResponse.json();
    const address = nominatimData.address || {};
    const city = extractLocationName(address);
    const place = extractPlaceLabel(address, nominatimData.name || nominatimData.display_name || '');

    return buildLocationDetails(city, place && place !== city ? place : '');
  } catch (error) {
    console.error('Location details lookup error:', error);
    return buildLocationDetails('', '');
  }
};