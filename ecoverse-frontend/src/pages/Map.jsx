import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';

// ---- Custom colored circle icons ----
function createIcon(colorHex, materialIconName) {
  return L.divIcon({
    className: '', 
    html: `
      <div style="
        width: 36px; height: 36px;
        background-color: ${colorHex};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 16px;
        transition: all 0.3s ease;
      " class="hover:scale-110">
        <span class="material-symbols-outlined" style="font-size: 18px; font-weight: bold;">${materialIconName}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

const solarIcon = createIcon('#D97706', 'wb_sunny');        // Energy - Orange
const plantationIcon = createIcon('#16A34A', 'park');       // Flora - Green
const wasteIcon = createIcon('#006399', 'recycling');       // Utility - Blue
const waterIcon = createIcon('#06B6D4', 'water_drop');      // Hydrology - Cyan

function getIconForCategory(category) {
  if (category === 'solar') return solarIcon;
  if (category === 'plantation') return plantationIcon;
  if (category === 'waste') return wasteIcon;
  if (category === 'water') return waterIcon;
  return plantationIcon;
}

// Flat-Earth projection polygon area calculator in square meters
function calculatePolygonArea(coordinates) {
  if (!coordinates || coordinates.length < 3) return 0;
  
  const R = 6378137; // Earth's radius in meters
  const rad = Math.PI / 180;
  let area = 0;
  
  const refLat = coordinates[0][0];
  const refLng = coordinates[0][1];
  
  const projectedPoints = coordinates.map(p => {
    const lat = p[0];
    const lng = p[1];
    const y = (lat - refLat) * rad * R;
    const x = (lng - refLng) * rad * R * Math.cos(refLat * rad);
    return { x, y };
  });
  
  const n = projectedPoints.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += projectedPoints[i].x * projectedPoints[j].y;
    area -= projectedPoints[j].x * projectedPoints[i].y;
  }
  
  return Math.abs(area) / 2.0;
}

// Centroid calculator
function calculateCentroid(points) {
  if (!points || points.length === 0) return [29.8918, 77.9601];
  let latSum = 0;
  let lngSum = 0;
  points.forEach(p => {
    latSum += p[0];
    lngSum += p[1];
  });
  return [latSum / points.length, lngSum / points.length];
}

// Map recentering helper
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 16);
    }
  }, [center, map]);
  return null;
}

// Map events handler to add points to polygon drawing
function MapEventsHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

export default function Map() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  // Campus Profile Metadata
  const [campus, setCampus] = useState(null);
  const [campusCenter, setCampusCenter] = useState([29.8918, 77.9601]); // Roorkee fallback

  // Map Data
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // College search lists & autocomplete dropdown
  const [registeredCampuses, setRegisteredCampuses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const dropdownRef = useRef(null);

  // Parameter spec lists
  const [speciesList, setSpeciesList] = useState([]);
  const [panelsList, setPanelsList] = useState([]);

  // Layer filters
  const [showPlantation, setShowPlantation] = useState(true);
  const [showSolar, setShowSolar] = useState(true);
  const [showWaste, setShowWaste] = useState(true);
  const [showWater, setShowWater] = useState(true);

  // Hover coordinates readout
  const [hoveredZone, setHoveredZone] = useState(null);
  const [mapView, setMapView] = useState('street');

  // Drawing state
  const [tempPoints, setTempPoints] = useState([]);
  
  // Right side panel configuration state
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState(0);

  // Sidebar visibility states
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);

  // Configuration Form inputs
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('plantation');
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedPanel, setSelectedPanel] = useState('');
  const [desiredCount, setDesiredCount] = useState('50');
  const [plantationYear, setPlantationYear] = useState(new Date().getFullYear().toString());
  const [wasteType, setWasteType] = useState('recycling');
  const [wasteCapacity, setWasteCapacity] = useState('50'); // kg/day
  const [tankCapacity, setTankCapacity] = useState('5000'); // Litres
  const [deployError, setDeployError] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  // Dynamic capacity limits
  const [maxCapacity, setMaxCapacity] = useState(0);

  // Fetch campus details, lists, parameter specs, and deployed assets
  useEffect(() => {
    async function initMapData() {
      try {
        // 1. Fetch Campus Profile
        const profileRes = await authFetch('/api/campus/profile');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setCampus(profileData.campus);
          setCampusCenter([profileData.campus.latitude, profileData.campus.longitude]);
        }

        // 2. Fetch all registered campuses for search dropdown
        const listRes = await authFetch('/api/campus/list');
        if (listRes.ok) {
          const listData = await listRes.json();
          setRegisteredCampuses(listData.campuses || []);
        }

        // 3. Fetch parameter matrices
        const paramsRes = await authFetch('/api/simulation-data');
        if (paramsRes.ok) {
          const paramsData = await paramsRes.json();
          setSpeciesList(paramsData.treeSpecies || []);
          setPanelsList(paramsData.solarPanels || []);
          if (paramsData.treeSpecies?.length > 0) {
            setSelectedSpecies(paramsData.treeSpecies[0].name);
          }
          if (paramsData.solarPanels?.length > 0) {
            setSelectedPanel(paramsData.solarPanels[0].name);
          }
        }

        // 4. Fetch assets
        await fetchZones();
      } catch (err) {
        console.error(err);
        setError('Connection failed. Please ensure the backend is active.');
        setLoading(false);
      }
    }
    initMapData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const clickHandler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', clickHandler);
    return () => document.removeEventListener('mousedown', clickHandler);
  }, []);

  // Update dynamic max limits based on selections
  useEffect(() => {
    if (calculatedArea <= 0) return;

    if (assetCategory === 'plantation') {
      const speciesObj = speciesList.find(s => s.name === selectedSpecies) || speciesList[0];
      if (speciesObj) {
        const spacing = speciesObj.spacingRequirement || 3;
        const maxTrees = Math.floor(calculatedArea / (spacing * spacing));
        setMaxCapacity(Math.max(maxTrees, 1));
        setDesiredCount(Math.max(maxTrees, 1).toString());
      }
    } else if (assetCategory === 'solar') {
      const panelObj = panelsList.find(p => p.name === selectedPanel) || panelsList[0];
      if (panelObj) {
        const areaReq = panelObj.areaRequired || 2;
        const maxPanels = Math.floor(calculatedArea / areaReq);
        setMaxCapacity(Math.max(maxPanels, 1));
        setDesiredCount(Math.max(maxPanels, 1).toString());
      }
    }
  }, [assetCategory, selectedSpecies, selectedPanel, calculatedArea, speciesList, panelsList]);

  const fetchZones = async () => {
    try {
      const res = await authFetch('/api/zones');
      if (!res.ok) throw new Error('Failed to retrieve map assets.');
      const data = await res.json();
      setZones(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Add click coordinate to temp points
  const handleMapClick = (latlng) => {
    if (showConfigPanel) return;
    setTempPoints(prev => [...prev, [latlng.lat, latlng.lng]]);
  };

  const handleClearPoints = () => {
    setTempPoints([]);
    setShowConfigPanel(false);
  };

  // Open right side panel
  const handleOpenConfigPanel = () => {
    if (tempPoints.length < 3) return;
    const area = calculatePolygonArea(tempPoints);
    setCalculatedArea(area);
    setAssetName('');
    setDeployError('');
    setShowConfigPanel(true);
  };

  // Submit asset deployment
  const handleDeployAsset = async (e) => {
    e.preventDefault();
    setDeployError('');

    if (!assetName.trim()) {
      setDeployError('Please enter a location or zone name.');
      return;
    }

    const count = parseInt(desiredCount) || 1;
    if (assetCategory === 'plantation' || assetCategory === 'solar') {
      if (count > maxCapacity) {
        setDeployError(`Quantity cannot exceed the maximum capacity of ${maxCapacity} units.`);
        return;
      }
      if (count < 1) {
        setDeployError('Quantity must be at least 1 unit.');
        return;
      }
    }

    setIsDeploying(true);

    // Build details structure
    let details = {
      area_sqm: calculatedArea,
      coordinates: tempPoints
    };

    if (assetCategory === 'plantation') {
      details.species = selectedSpecies;
      details.count = count;
      details.year = parseInt(plantationYear) || new Date().getFullYear();
    } else if (assetCategory === 'solar') {
      const panelObj = panelsList.find(p => p.name === selectedPanel) || panelsList[0];
      details.panelType = selectedPanel;
      details.numPanels = count;
      details.capacityKw = (count * (panelObj?.wattage || 300)) / 1000;
    } else if (assetCategory === 'waste') {
      details.type = wasteType;
      details.capacity = parseFloat(wasteCapacity) || 10;
    } else if (assetCategory === 'water') {
      details.type = 'harvesting';
      details.tankCapacity = parseFloat(tankCapacity) || 1000;
      details.collectionArea = calculatedArea;
    }

    const centroid = calculateCentroid(tempPoints);

    try {
      const res = await authFetch('/api/campus/assets', {
        method: 'POST',
        body: JSON.stringify({
          name: assetName,
          category: assetCategory,
          latitude: centroid[0],
          longitude: centroid[1],
          details
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deploy asset.');

      setTempPoints([]);
      setShowConfigPanel(false);
      await fetchZones(); // Refresh assets
    } catch (err) {
      setDeployError(err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  // Delete asset handler
  const handleDeleteAsset = async (id) => {
    if (!window.confirm('Are you sure you want to decommission this asset from the campus map?')) return;
    try {
      const res = await authFetch(`/api/campus/assets/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchZones();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove asset.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error removing asset.');
    }
  };

  // College search handling
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (val.trim() === '') {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    // Filter registered campuses
    const regFiltered = registeredCampuses.filter(c => 
      c.name.toLowerCase().includes(val.toLowerCase()) || 
      c.address.toLowerCase().includes(val.toLowerCase())
    );

    setSearchResults(regFiltered);
    setShowSearchDropdown(true);
  };

  // Fly map to campus
  const selectCampusLocation = (camp) => {
    setCampusCenter([camp.latitude, camp.longitude]);
    setSearchQuery(camp.name);
    setShowSearchDropdown(false);
  };

  // Trigger geocoder search globally via Nominatim API
  const handleGeocodeSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingGeocode(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        setCampusCenter([lat, lon]);
        setShowSearchDropdown(false);
      } else {
        alert('Location not found. Try entering a different campus name or address.');
      }
    } catch (err) {
      console.error(err);
      alert('Geocoding search failed. Please check internet connection.');
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  // Layer filters
  const filteredZones = zones.filter((zone) => {
    if (zone.category === 'plantation' && !showPlantation) return false;
    if (zone.category === 'solar' && !showSolar) return false;
    if (zone.category === 'waste' && !showWaste) return false;
    if (zone.category === 'water' && !showWater) return false;
    return true;
  });

  const activeLat = hoveredZone ? hoveredZone.latitude : campusCenter[0];
  const activeLng = hoveredZone ? hoveredZone.longitude : campusCenter[1];

  return (
    <main className="map-container relative overflow-hidden w-full bg-surface-container-low flex" style={{ height: 'calc(100vh - 64px)' }}>
      
      {/* Floating Toggle Button for Left Sidebar */}
      <button
        onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
        className="absolute top-4 left-4 z-[1050] w-10 h-10 bg-surface/90 backdrop-blur-md border border-outline-variant/30 rounded-xl shadow-md flex items-center justify-center text-primary cursor-pointer hover:bg-surface transition"
        title={leftSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        <span className="material-symbols-outlined">{leftSidebarOpen ? "menu_open" : "menu"}</span>
      </button>

      {/* Floating Left Sidebar Panel */}
      <aside 
        className={`absolute top-4 bottom-12 w-80 bg-surface/95 backdrop-blur-md border border-outline-variant/30 rounded-2xl z-[1000] flex flex-col shadow-soft transition-all duration-300 ${
          leftSidebarOpen ? 'left-4 opacity-100' : '-left-96 opacity-0 pointer-events-none'
        }`}
      >
        {/* Title area (shifted right to not overlap toggle button) */}
        <div className="pl-16 pr-6 py-5 border-b border-outline-variant/20 flex flex-col justify-center">
          <h1 className="font-card-h3 text-sm text-primary font-bold truncate">
            {campus ? campus.name : 'Configuring Campus'}
          </h1>
          <p className="font-body-main text-on-surface-variant text-[10px] truncate">
            {campus ? campus.address : 'Interactive Node Mapping'}
          </p>
        </div>

        <div className="p-5 border-b border-outline-variant/10">
          {/* Autocomplete College search bar */}
          <form onSubmit={handleGeocodeSearch} className="relative" ref={dropdownRef}>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">search</span>
            <input
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-9 pr-12 py-2 text-xs focus:ring-2 focus:ring-primary focus:bg-surface transition-all outline-none"
              placeholder="Search registered colleges..."
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery && setShowSearchDropdown(true)}
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="submit"
                disabled={isSearchingGeocode}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary font-bold text-[9px] uppercase hover:underline cursor-pointer"
              >
                {isSearchingGeocode ? '...' : 'Search'}
              </button>
            )}

            {/* Dropdown list */}
            {showSearchDropdown && (
              <div className="absolute left-0 right-0 mt-1.5 bg-surface border border-outline-variant/30 rounded-xl shadow-lg max-h-48 overflow-y-auto z-[1100] custom-scrollbar">
                {searchResults.map(camp => (
                  <button
                    key={camp.id}
                    type="button"
                    onClick={() => selectCampusLocation(camp)}
                    className="w-full text-left px-4 py-2 hover:bg-surface-container-low text-xs border-b border-outline-variant/10 flex flex-col gap-0.5"
                  >
                    <span className="font-bold text-on-surface truncate">{camp.name}</span>
                    <span className="text-on-surface-variant truncate text-[10px]">{camp.address}</span>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <button
                    type="submit"
                    className="w-full text-left px-4 py-2.5 hover:bg-surface-container-low text-xs text-primary font-semibold flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">travel_explore</span>
                    Search globally for "{searchQuery}"
                  </button>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Content scroll area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* Map View Mode Switcher */}
          <div className="bg-surface-container/30 p-3 rounded-xl border border-outline-variant/15 flex flex-col gap-2">
            <span className="text-[9px] font-bold text-outline uppercase tracking-wider">Map Visualization</span>
            <button
              type="button"
              onClick={() => setMapView(mapView === 'street' ? 'satellite' : 'street')}
              className="w-full py-2 bg-surface border border-outline-variant/35 rounded-lg text-xs font-bold text-primary flex items-center justify-center gap-1.5 hover:bg-surface-container-low transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              Show {mapView === 'street' ? 'Satellite view' : 'Street view'}
            </button>
          </div>

          {/* Layer Switches */}
          <div>
            <h3 className="font-label-caps text-[9px] text-outline mb-2.5 uppercase tracking-wider font-bold">Sustainability Layers</h3>
            <div className="space-y-2">
              {/* Plantation */}
              <label className={`flex items-center justify-between p-2 rounded-xl hover:bg-surface-container transition-colors cursor-pointer group ${showPlantation ? 'bg-surface-container-low border border-primary/10' : 'border border-transparent'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-impact-positive/10 flex items-center justify-center text-impact-positive">
                    <span className="material-symbols-outlined text-[16px]">park</span>
                  </div>
                  <span className="font-semibold text-on-surface text-xs font-body-main">Plantation Zones</span>
                </div>
                <input
                  checked={showPlantation}
                  onChange={(e) => setShowPlantation(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-impact-positive focus:ring-impact-positive cursor-pointer accent-impact-positive"
                  type="checkbox"
                />
              </label>

              {/* Solar */}
              <label className={`flex items-center justify-between p-2 rounded-xl hover:bg-surface-container transition-colors cursor-pointer group ${showSolar ? 'bg-surface-container-low border border-primary/10' : 'border border-transparent'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-impact-warning/10 flex items-center justify-center text-impact-warning">
                    <span className="material-symbols-outlined text-[16px]">wb_sunny</span>
                  </div>
                  <span className="font-semibold text-on-surface text-xs font-body-main">Solar Installations</span>
                </div>
                <input
                  checked={showSolar}
                  onChange={(e) => setShowSolar(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-impact-warning focus:ring-impact-warning cursor-pointer accent-impact-warning"
                  type="checkbox"
                />
              </label>

              {/* Waste */}
              <label className={`flex items-center justify-between p-2 rounded-xl hover:bg-surface-container transition-colors cursor-pointer group ${showWaste ? 'bg-surface-container-low border border-primary/10' : 'border border-transparent'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[16px]">recycling</span>
                  </div>
                  <span className="font-semibold text-on-surface text-xs font-body-main">Waste Management</span>
                </div>
                <input
                  checked={showWaste}
                  onChange={(e) => setShowWaste(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer accent-primary"
                  type="checkbox"
                />
              </label>

              {/* Water */}
              <label className={`flex items-center justify-between p-2 rounded-xl hover:bg-surface-container transition-colors cursor-pointer group ${showWater ? 'bg-surface-container-low border border-primary/10' : 'border border-transparent'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[16px]">water_drop</span>
                  </div>
                  <span className="font-semibold text-on-surface text-xs font-body-main">Rainwater Harvesting</span>
                </div>
                <input
                  checked={showWater}
                  onChange={(e) => setShowWater(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-secondary focus:ring-secondary cursor-pointer accent-secondary"
                  type="checkbox"
                />
              </label>
            </div>
          </div>

          {/* Dynamic drawing helper */}
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 text-xs leading-relaxed text-on-surface-variant flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <span className="material-symbols-outlined text-sm font-bold">polyline</span>
              <span>Draw Boundary Area</span>
            </div>
            <p className="text-[10px]">Click at least 3 points on the map grid to highlight a boundary region. Once satisfied, click <strong>Configure Area</strong> below.</p>
            
            {tempPoints.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-primary/20 mt-1">
                <span className="font-semibold font-mono text-[9px]">Points Placed: {tempPoints.length}</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearPoints}
                    className="flex-1 py-1.5 bg-surface border border-outline-variant rounded-lg text-[9px] font-bold text-on-surface-variant hover:bg-surface-container transition cursor-pointer"
                  >
                    Clear
                  </button>
                  {tempPoints.length >= 3 && (
                    <button
                      onClick={handleOpenConfigPanel}
                      className="flex-1 py-1.5 bg-primary text-on-primary rounded-lg text-[9px] font-bold hover:bg-primary/95 transition cursor-pointer"
                    >
                      Configure Area
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 bg-surface-container-low border-t border-outline-variant/30 mt-auto rounded-b-2xl">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-on-surface-variant font-bold">Total Active Zones</span>
            <span className="font-mono-data font-bold text-primary">{zones.length} units</span>
          </div>
        </div>
      </aside>

      {/* Main Map View Section (Takes 100% of viewport layout) */}
      <section className="w-full h-full z-10 relative">

        {/* Info label overlay on top-left of map */}
        {tempPoints.length > 0 && !showConfigPanel && (
          <div className="absolute top-4 left-16 z-[400] bg-primary text-on-primary px-3.5 py-2 rounded-xl shadow-lg text-[11px] font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm font-bold animate-pulse">edit_location</span>
            <span>Placing Boundary Vertices... Click points to draw shape.</span>
          </div>
        )}

        <MapContainer center={campusCenter} zoom={16} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            key={mapView}
            url={mapView === 'street'
              ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"}
            attribution={mapView === 'street'
              ? '&copy; OpenStreetMap contributors'
              : 'Tiles &copy; Esri'}
          />

          <RecenterMap center={campusCenter} />
          <MapEventsHandler onMapClick={handleMapClick} />

          {/* Render Deployed Assets Boundaries (Polygons) */}
          {!loading && zones.map(zone => {
            const hasCoords = zone.details && zone.details.coordinates && zone.details.coordinates.length >= 3;
            if (!hasCoords) return null;
            const color = zone.category === 'plantation' ? '#16A34A' : zone.category === 'solar' ? '#D97706' : zone.category === 'waste' ? '#006399' : '#06B6D4';
            return (
              <Polygon
                key={zone.id}
                positions={zone.details.coordinates}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.18,
                  weight: 2
                }}
              />
            );
          })}

          {/* Render Deployed Assets Markers (Centroids) */}
          {!loading && filteredZones.map((zone) => (
            <Marker
              key={zone.id}
              position={[zone.latitude, zone.longitude]}
              icon={getIconForCategory(zone.category)}
              eventHandlers={{
                mouseover: () => setHoveredZone(zone),
                mouseout: () => setHoveredZone(null),
              }}
            >
              <Popup>
                <div className="w-64 font-body-main text-on-surface">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm leading-tight text-on-surface">{zone.name}</h4>
                      <p className="text-[9.5px] text-on-surface-variant uppercase tracking-wider font-bold mt-0.5">
                        {zone.category === 'solar' ? 'Renewable Solar' : zone.category === 'plantation' ? 'Plantation Belt' : zone.category === 'waste' ? 'Waste Center' : 'Hydrology Unit'}
                      </p>
                    </div>
                    <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${zone.category === 'solar' ? 'bg-impact-warning/10 text-impact-warning' : zone.category === 'plantation' ? 'bg-impact-positive/10 text-impact-positive' : zone.category === 'waste' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                      Active
                    </span>
                  </div>

                  <div className="space-y-2 text-xs border-t border-b border-outline-variant/10 py-2.5 my-2">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Asset Area:</span>
                      <span className="font-bold">{(zone.area_sqm || 0).toFixed(0)} m²</span>
                    </div>

                    {zone.category === 'plantation' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Trees Planted:</span>
                          <span className="font-bold">{zone.estimated_trees} saplings</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Annual CO₂ Sink:</span>
                          <span className="font-bold text-impact-positive">{(zone.estimated_co2_absorption_tons * 1000).toFixed(0)} kg/year</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Est. Project Cost:</span>
                          <span className="font-bold">₹{zone.total_plantation_cost?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Maint./Year:</span>
                          <span className="font-bold text-impact-warning">₹{zone.annual_maintenance_cost?.toLocaleString('en-IN')}</span>
                        </div>
                      </>
                    )}

                    {zone.category === 'solar' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Installed Panels:</span>
                          <span className="font-bold">{zone.estimated_panels} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Electricity Yield:</span>
                          <span className="font-bold">{Math.round(zone.estimated_energy_output_kwh).toLocaleString()} kWh/year</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">CO₂ Avoided:</span>
                          <span className="font-bold text-impact-positive">{(zone.estimated_co2_avoided_tons).toFixed(1)} Tons/yr</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Installation Cost:</span>
                          <span className="font-bold">₹{zone.installation_cost?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant text-impact-positive">Annual Savings:</span>
                          <span className="font-bold text-impact-positive">₹{zone.annual_savings?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant font-bold">Payback ROI:</span>
                          <span className="font-bold text-primary font-mono">{(zone.installation_cost / zone.annual_savings).toFixed(1)} years</span>
                        </div>
                      </>
                    )}

                    {zone.category === 'waste' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Students Served:</span>
                          <span className="font-bold">{zone.estimated_students_served} cap</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Diverted/Recycled:</span>
                          <span className="font-bold">{(zone.estimated_diverted_waste_kg).toLocaleString()} kg/yr</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Carbon Avoided:</span>
                          <span className="font-bold text-impact-positive">{(zone.estimated_co2_avoided_tons).toFixed(1)} Tons/yr</span>
                        </div>
                      </>
                    )}

                    {zone.category === 'water' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Tank Capacity:</span>
                          <span className="font-bold">{zone.tank_capacity_litres?.toLocaleString()} Litres</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Collection Potential:</span>
                          <span className="font-bold text-primary">{zone.estimated_harvest_litres?.toLocaleString()} L/year</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleDeleteAsset(zone.id)}
                      className="flex-1 bg-error-container text-on-error-container hover:bg-error-container/85 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      Decommission
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render Temporary Drawing Points & Polygon */}
          {tempPoints.length >= 3 && (
            <Polygon
              positions={tempPoints}
              pathOptions={{
                color: 'var(--color-primary)',
                dashArray: '4, 4',
                fillOpacity: 0.15,
                weight: 2
              }}
            />
          )}

          {tempPoints.map((pt, idx) => (
            <Marker
              key={idx}
              position={pt}
              icon={L.divIcon({
                className: '',
                html: `
                  <div style="
                    width: 14px; height: 14px;
                    border-radius: 50%;
                    background: var(--color-primary);
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-family: monospace; font-size: 8px; font-weight: bold;
                  ">
                    ${idx + 1}
                  </div>
                `,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              })}
            />
          ))}
        </MapContainer>

        {/* Shaded legend panel overlay */}
        <div className="absolute bottom-16 left-4 flex items-center gap-5 glass-panel px-5 py-2.5 rounded-2xl border border-white/50 shadow-lg z-20">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-impact-positive"></div>
            <span className="text-[9px] font-bold text-on-surface-variant font-label-caps tracking-wider uppercase">Flora</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-impact-warning"></div>
            <span className="text-[9px] font-bold text-on-surface-variant font-label-caps tracking-wider uppercase">Energy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#006399]"></div>
            <span className="text-[9px] font-bold text-on-surface-variant font-label-caps tracking-wider uppercase">Utility</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-secondary"></div>
            <span className="text-[9px] font-bold text-on-surface-variant font-label-caps tracking-wider uppercase">Hydrology</span>
          </div>
        </div>
      </section>

      {/* Floating Right Side Configuration Panel (Slide-Over) */}
      {showConfigPanel && (
        <aside className="absolute top-4 right-4 bottom-12 w-80 bg-surface/95 backdrop-blur-md border border-outline-variant/30 rounded-2xl z-[1000] flex flex-col shadow-soft overflow-hidden animate-fade-in">
          <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low">
            <div>
              <h2 className="text-xs font-bold text-primary uppercase tracking-wider">Configure Area</h2>
              <p className="text-[9px] text-on-surface-variant font-semibold">Step 2: Deploy Sustainability Node</p>
            </div>
            <button
              onClick={() => setShowConfigPanel(false)}
              className="text-on-surface-variant hover:text-primary transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">
            {deployError && (
              <div className="flex items-center gap-2 p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold">
                <span className="material-symbols-outlined text-base">error</span>
                {deployError}
              </div>
            )}

            <form onSubmit={handleDeployAsset} className="flex flex-col gap-4">
              {/* Asset Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Asset / Zone Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block C Canopy / Admin solar"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* Category selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Asset Category *</label>
                <select
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary transition font-semibold text-on-surface cursor-pointer"
                >
                  <option value="plantation">Tree Plantation Zone</option>
                  <option value="solar">Solar Installation Zone</option>
                  <option value="waste">Waste Management Node</option>
                  <option value="water">Rainwater Harvesting Node</option>
                </select>
              </div>

              {/* Display Calculated Area */}
              <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/10 flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wide">Boundary Metrics</span>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-on-surface-variant">Enclosed Area:</span>
                  <span className="font-mono-data font-bold text-primary text-xs">{calculatedArea.toFixed(1)} m²</span>
                </div>
              </div>

              {/* Specific inputs depending on category selection */}
              {assetCategory === 'plantation' && (
                <div className="flex flex-col gap-3 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/10">
                  
                  {/* Species Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-outline uppercase">Tree Species</label>
                    <select
                      value={selectedSpecies}
                      onChange={(e) => setSelectedSpecies(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/35 rounded-lg px-3 py-1.5 text-xs focus:outline-none text-on-surface cursor-pointer font-semibold"
                    >
                      {speciesList.map(s => (
                        <option key={s.id || s.name} value={s.name}>{s.name} (spacing: {s.spacingRequirement}m)</option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Max Limit & Desired Input */}
                  <div className="flex justify-between items-center text-[10px] bg-primary/5 px-2.5 py-1.5 rounded border border-primary/10">
                    <span className="text-on-surface-variant font-semibold">Max Trees Capacity:</span>
                    <span className="font-bold text-primary font-mono">{maxCapacity} trees</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-outline uppercase">Desired Quantity to Plant</label>
                    <input
                      type="number"
                      min="1"
                      max={maxCapacity}
                      required
                      value={desiredCount}
                      onChange={(e) => setDesiredCount(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/35 rounded-lg px-3 py-1.5 text-xs focus:outline-none font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-outline uppercase">Plantation Year</label>
                    <input
                      type="number"
                      min="2000"
                      required
                      value={plantationYear}
                      onChange={(e) => setPlantationYear(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/35 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {assetCategory === 'solar' && (
                <div className="flex flex-col gap-3 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/10">
                  
                  {/* Panel Technology */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-outline uppercase">Technology Type</label>
                    <select
                      value={selectedPanel}
                      onChange={(e) => setSelectedPanel(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/35 rounded-lg px-3 py-1.5 text-xs focus:outline-none text-on-surface cursor-pointer font-semibold"
                    >
                      {panelsList.map(p => (
                        <option key={p.id || p.name} value={p.name}>{p.name} ({p.wattage}W)</option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Max Limit & Desired Input */}
                  <div className="flex justify-between items-center text-[10px] bg-impact-warning/5 px-2.5 py-1.5 rounded border border-impact-warning/10">
                    <span className="text-on-surface-variant font-semibold">Max Panels Capacity:</span>
                    <span className="font-bold text-impact-warning font-mono">{maxCapacity} units</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-outline uppercase">Desired Panels count</label>
                    <input
                      type="number"
                      min="1"
                      max={maxCapacity}
                      required
                      value={desiredCount}
                      onChange={(e) => setDesiredCount(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/35 rounded-lg px-3 py-1.5 text-xs focus:outline-none font-bold"
                    />
                  </div>

                  {/* Estimated kW Capacity Display */}
                  <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
                    <span>Est. Peak Power output:</span>
                    <span className="font-bold font-mono">
                      {((parseInt(desiredCount) || 0) * (panelsList.find(p => p.name === selectedPanel)?.wattage || 300) / 1000).toFixed(1)} kW
                    </span>
                  </div>
                </div>
              )}

              {assetCategory === 'waste' && (
                <div className="flex flex-col gap-3 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/10">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-outline uppercase">Bin or Facility Type</label>
                    <select
                      value={wasteType}
                      onChange={(e) => setWasteType(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/35 rounded-lg px-3 py-1.5 text-xs focus:outline-none text-on-surface cursor-pointer font-semibold"
                    >
                      <option value="dustbin">Dustbin Placement</option>
                      <option value="compost">Composting Unit</option>
                      <option value="recycling">Recycling Unit</option>
                      <option value="collection">Collection Area</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-outline uppercase">Processing Capacity (kg/day)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={wasteCapacity}
                      onChange={(e) => setWasteCapacity(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/35 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {assetCategory === 'water' && (
                <div className="flex flex-col gap-3 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/10">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-outline uppercase">Tank Capacity (Litres)</label>
                    <input
                      type="number"
                      min="100"
                      required
                      value={tankCapacity}
                      onChange={(e) => setTankCapacity(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/35 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-on-surface-variant mt-1">
                    <span>Rain Collection Area:</span>
                    <span className="font-bold">{calculatedArea.toFixed(0)} m²</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClearPoints}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-xl font-bold text-xs hover:bg-surface-container-high transition cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isDeploying}
                  className="flex-grow bg-primary text-on-primary py-2 rounded-xl font-bold text-xs cursor-pointer hover:bg-primary/95 transition-all shadow-md disabled:opacity-70"
                >
                  {isDeploying ? 'Deploying...' : 'Deploy Asset'}
                </button>
              </div>
            </form>
          </div>
        </aside>
      )}

      {/* Floating Status Bar Overlay */}
      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 h-8 bg-primary/90 backdrop-blur-md z-30 flex items-center px-4 rounded-xl justify-between text-[9px] text-on-primary pointer-events-none gap-6 shadow-md border border-white/20">
        <p className="font-semibold">EcoVerse Live Mapping Grid</p>
        <div className="flex gap-4">
          <span>Lat: {activeLat.toFixed(4)}° N</span>
          <span>Lon: {activeLng.toFixed(4)}° E</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-impact-positive animate-pulse"></span>
            Sensors Sync
          </span>
        </div>
      </footer>
    </main>
  );
}