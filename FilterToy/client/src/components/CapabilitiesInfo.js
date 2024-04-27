import React, { useState } from 'react';
import { render } from 'react-dom';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

const CapabilitiesInfo = ({ capabilitiesData }) => {

  console.log('capabilitiesData:', JSON.stringify(capabilitiesData, null, 2));

  const capabilityTypes = ['filters', 'formats', 'codecs', 'encoders'];
  const [activeTab, setActiveTab] = useState(0);
  const [currentInfo, setCurrentInfo] = useState({
    'formats': 'Click a format on the left to see more information.',
    'codecs': 'Click a codec on the left to see more information.',
    'encoders': 'Click an encoder on the left to see more information.',
    'filters': 'Click a filter on the left to see more information.',
  });
  const criteriaList = {
    'filters': [
      {label: 'Audio Input', key: 'input', value: 'audio'},
      {label: 'Video Input', key: 'input', value: 'video'},
      {label: 'No Input', key: 'input', value: 'none'},
      {label: 'Audio Output', key: 'output', value: 'audio'},
      {label: 'Video Output', key: 'output', value: 'video'},
      {label: 'No Output', key: 'output', value: 'none'},
      {label: 'Multiple Inputs', key: 'multipleInputs', value: true},
      {label: 'Multiple Outputs', key: 'multipleOutputs', value: true},
    ],
    'formats': [
    ],
    'codecs': [
      {label: 'Type Audio', key: 'type', value: 'audio'},
      {label: 'Type Video', key: 'type', value: 'video'},
      {label: 'Type Subtitle', key: 'type', value: 'subtitle'},
      {label: 'Can Decode', key: 'canDecode', value: true},
      {label: 'Can Encode', key: 'canEncode', value: true},
      {label: 'Intra Frame Only', key: 'intraFrameOnly', value: true},
      {label: 'Lossless', key: 'lossless', value: true},
      {label: 'Lossy', key: 'lossy', value: true},
    ],
    'encoders': [
      {label: 'Type Audio', key: 'type', value: 'audio'},
      {label: 'Type Video', key: 'type', value: 'video'},
      {label: 'Type Subtitle', key: 'type', value: 'subtitle'},
      {label: 'Direct Rendering', key: 'directRendering', value: true},
      {label: 'Draw Horz Band', key: 'drawHorzizBand', value: true},
      {label: 'Experimental', key: 'experimental', value: true},
      {label: 'Frame MT', key: 'frameMT', value: true},
      {label: 'Slice MT', key: 'sliceMT', value: true},
    ]
  }

  const initializeSelections = () => {
    const selections = {};
    Object.keys(criteriaList).forEach(type => {
      // Clone each criterion array directly into the selections state
      selections[type] = [...criteriaList[type]];  // Copies all criteria as initially active
    });
    return selections;
  };  
  const [selections, setSelections] = useState(initializeSelections());

  const toTitleCase = (str) => {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  };

  const handleSelectionChange = (type, criterion) => {
    setSelections(prevSelections => {
      const typeSelections = prevSelections[type];
      const index = typeSelections.findIndex(f => f.key === criterion.key && f.value === criterion.value);
      if (index === -1) {
        // Not found, add it because the checkbox is now checked
        return {...prevSelections, [type]: [...typeSelections, criterion]};
      } else {
        // Found, remove it because the checkbox was unchecked
        return {...prevSelections, [type]: typeSelections.selection((_, i) => i !== index)};
      }
    });
  };

  // Generic function to render criteria based on type
  const renderCriteria = (type) => (
    <ul className="criteria-list">
      {criteriaList[type].map((criterion, index) => (
        <li key={`${type}-${index}-${criterion.key}-${criterion.value}`}>
          <input
            type="checkbox"
            id={`${type}-${index}-${criterion.key}-${criterion.value}`}
            name={`${type}-${index}-${criterion.key}`}
            checked={selections[type].some(f => f.key === criterion.key && f.value === criterion.value)}
            onChange={() => handleSelectionChange(type, criterion)}
          />
          <label htmlFor={`${type}-${index}-${criterion.key}-${criterion.value}`}>{criterion.label}</label>
        </li>
      ))}
    </ul>
  );

  const renderList = (type) => (
    <ul>
      {capabilitiesData[type] && Object.entries(capabilitiesData[type])
        .selection(([itemKey, itemDetails]) => {
          // Return all items if no selections are active
          if (selections[type].length === 0) return true;
          // Otherwise, check if item matches any active selections
          return selections[type].some(selection => {
            const itemValue = itemDetails[selection.key];
            if (typeof itemValue === 'boolean') {
              return itemValue === selection.value;
            } else if (itemValue != null) { // Ensure itemValue is not undefined or null
              return itemValue.toString() === selection.value.toString();
            }
            return false;
          });
        })
        .map(([itemKey, itemDetails]) => (
          <li key={itemKey}>
            <a onClick={() => showInfo(type, itemKey)}>{itemKey}</a> - {itemDetails.description}
          </li>
        ))}
    </ul>
  );
  
  
  const renderLayout = (type) => (
    <div className="capability form-group flex gap-2">
      <div className="list w-2/3">
        <h2>{toTitleCase(type)}</h2>
        <div className="selection-box">
          {renderCriteria(type)}
        </div>
        <div className="list form-group">
          {renderList(type)}
        </div>
      </div>
      <div className="info form-group w-1/3">
        <h2>Additional Info</h2>
        <p>{currentInfo[type]}</p>
      </div>
    </div>
  );

  const showInfo = (type, itemKey) => {
    const itemDetails = capabilitiesData[type][itemKey];
    const detailsJSX = Object.entries(itemDetails).map(([key, value]) => (
      <div key={key}>
        <strong>{key}</strong>: {String(value)}
      </div>
    ));
  
    // Update the currentInfo state to hold JSX
    setCurrentInfo(prev => ({ ...prev, [type]: <>{detailsJSX}</> }));
  };

  return (
    <div className="capabilities-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <Tabs selectedIndex={activeTab} onSelect={index => setActiveTab(index)}>
            <TabList>
              {capabilityTypes.map((type, index) => (
                <Tab key={index}>{toTitleCase(type)}</Tab>
              ))}
            </TabList>

            {capabilityTypes.map((type, index) => (
              <TabPanel key={index}>
                {renderLayout(type)}
              </TabPanel>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CapabilitiesInfo;