import React, { useState } from "react";
import Form from "./form";

const Tabs = () => {
  // Each tab now includes its own form state
  const [tabs, setTabs] = useState([{
    id: 1, 
    title: 'New Request', 
    active: true,
    formState: {
      reqMethod: 'GET',
      url: '',
      reqBody: '',
      response: null,
      error: null
    }
  }]);
  
  const [nextTabId, setNextTabId] = useState(2);
  const [newTabDialog, setNewTabDialog] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState('New Request');

  // Set functions
  const openNewTabDialog = () => {
    setNewTabDialog(true);
  };

  const createNewTab = () => {
    if(newTabTitle.trim()){
      const newTab = {
        id: nextTabId,
        title: newTabTitle.trim(),
        active: false,
        formState: {
          reqMethod: 'GET',
          url: '',
          reqBody: '',
          response: null,
          error: null
        }
      };

      // Deactivate all tabs and add a new one
      setTabs(otherTabs => otherTabs.map(tab => ({...tab, active: false})).concat(newTab));
      setNextTabId(prevID => prevID+1);

      // Set new tab as active
      activateTab(nextTabId);

      // Reset form
      setNewTabTitle('');
      setNewTabDialog(false);
    }
  };

  // Cancel creating a new tab
  const cancelNewTab = () => {
    setNewTabTitle('');
    setNewTabDialog(false);
  };

  // Function to close a tab
  const closeTab = (tabID, e) => {
    e.stopPropagation(); // Prevent tab activation when closing

    setTabs(otherTabs => {
      const tabToClose = otherTabs.find(tab => tab.id === tabID);
      const isActiveTab = tabToClose && tabToClose.active;
      const filteredTabs = otherTabs.filter(tab => tab.id !== tabID);

      // If we close the active tab and have remaining tabs, make another one active
      if(isActiveTab && filteredTabs.length > 0){
        const newActiveIdx = Math.min(otherTabs.findIndex(tab => tab.id === tabID), filteredTabs.length-1);
        filteredTabs[newActiveIdx].active = true;
      }
      return filteredTabs;
    });       
  };

  // Function to activate a tab
  const activateTab = (tabID) => {
    setTabs(otherTabs => otherTabs.map(tab => ({...tab, active: tab.id === tabID})));
  };

  // Find the active tab
  const activeTab = tabs.find(tab => tab.active) || (tabs.length > 0 ? tabs[0] : null);

  // Function to update form state for a specific tab
  const updateTabFormState = (tabId, newFormState) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, formState: { ...tab.formState, ...newFormState } }
          : tab
      )
    );
  };

  return (
    <div className="browser-tabs-container">
      <div className="browser-tabs-header">
        <div className="tabs-list">
          {tabs.map(tab => (
            <div 
              key={tab.id} 
              className={`browser-tab ${tab.active ? 'active' : ''}`}
              onClick={() => activateTab(tab.id)}
            >
              <span className="tab-title">{tab.title}</span>
              <button 
                className="close-tab"
                onClick={(e) => closeTab(tab.id, e)}
                aria-label="Close tab"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button 
          className="new-tab-button" 
          onClick={openNewTabDialog}
          aria-label="Create new tab"
        >
          +
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab ? (
          <div className="active-tab-content">
            <Form 
              tabId={activeTab.id} 
              formState={activeTab.formState}
              updateFormState={(newState) => updateTabFormState(activeTab.id, newState)}
            />
          </div>
        ) : (
          <div className="empty-state">
            <p>No tabs open. Click the + button to create a new tab.</p>
          </div>
        )}
      </div>

      {/* New Tab Dialog */}
      {newTabDialog && (
        <div className="new-tab-dialog-overlay">
          <div className="new-tab-dialog">
            <h3>Create New Tab</h3>
            <div className="form-group">
              <label htmlFor="tab-title">Tab Title</label>
              <input
                id="tab-title"
                type="text"
                value={newTabTitle}
                onChange={(e) => setNewTabTitle(e.target.value)}
                placeholder="Enter tab title"
                autoFocus
              />
            </div>
            <div className="dialog-buttons">
              <button className="cancel-button" onClick={cancelNewTab}>Cancel</button>
              <button className="create-button" onClick={createNewTab}>Create Tab</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tabs;