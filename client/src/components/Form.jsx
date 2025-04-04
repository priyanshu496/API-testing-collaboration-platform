import React, { useState } from "react";
import axios from "axios";

const Form = ({ tabId, formState, updateFormState }) => {
  const [reqLoading, setReqLoading] = useState(false);

  const handleMethodChange = (e) => {
    updateFormState({ reqMethod: e.target.value });
  };
  
  const handleUrlChange = (e) => {
    updateFormState({ url: e.target.value });
  };
  
  const handleBodyChange = (e) => {
    updateFormState({ reqBody: e.target.value });
  };
  
  const handleSubmit = async () => {
    // Validate input
    if(!formState.url){
      updateFormState({ error: 'URL Required', response: null });
      return;
    }
    
    // Parse the request body if exists and not empty
    let parsedBody = null;
    if(formState.reqBody && ['POST','PUT','PATCH'].includes(formState.reqMethod)){
      try {
        parsedBody = JSON.parse(formState.reqBody);
      } catch(e) {
        console.log(e);
        updateFormState({ error: "Invalid Request in JSON body", response: null });
        return;
      }
    }
    
    setReqLoading(true);
    updateFormState({ error: null, response: null });

    try {
      console.log(`Sending Request to ${formState.url}`, parsedBody ? 'With Body' : 'Without Body');
      // Make request to Backend using axios
      const result = await axios.post('http://localhost:5000/api/test', {
        method: formState.reqMethod,
        url: formState.url,
        body: formState.reqBody,
        tabId: tabId // Pass the tabId to identify which tab made the request
      });
      
      // Set response
      updateFormState({ response: result.data });
      
      console.log('Response received: ', result.data);
    } catch(e) {
      console.error(e);
      updateFormState({ error: e.message || "An error occurred" });
    } finally {
      setReqLoading(false);
    }
  };

  // Format JSON for display
  const formatOutput = (data) => {
    if(!data) {
      return null;
    }
    
    try {
      if(typeof data === 'object') {
        return JSON.stringify(data, null, 2);
      }
      return data;
    } catch(e) {
      console.error(e);
      return String(data);
    }
  };

  return(
    <div className="request-form">
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="url-row">
          <select
            id={`reqMethod-${tabId}`}
            value={formState.reqMethod}
            onChange={handleMethodChange}
            className="method-selector"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          
          <input 
            type="text" 
            id={`url-${tabId}`} 
            className="url-input" 
            value={formState.url} 
            onChange={handleUrlChange}
            placeholder="Enter URL"
          />
          
          <button 
            type="button" 
            className="send-button" 
            onClick={handleSubmit} 
            disabled={reqLoading}
          >
            {reqLoading ? 'SENDING...' : 'SEND'}
          </button>
        </div>
        
        {['PUT', 'PATCH', 'POST'].includes(formState.reqMethod) && (
          <div className="request-body-container">
            <h4>Request Body (JSON)</h4>
            <textarea 
              id={`reqBody-${tabId}`} 
              className="request-body"
              value={formState.reqBody}
              onChange={handleBodyChange}
              placeholder='{ "key": "value" }'
              rows={7}
            ></textarea>
          </div>
        )}
      </form>

      <div className="response-container">
        <h4>Response</h4>
        <div className="response-content">
          {reqLoading && <p className="loading">Loading...</p>}
          {formState.error && <p className="error-message">{formState.error}</p>}
          {formState.response && (
            <div className="response-data">
              <div className="response-meta">
                <span className="status-label">Status: </span>
                <span className="status-value">{formState.response.status}</span>
                {formState.response.responseTime && (
                  <span className="response-time">
                    <span className="time-label">Time: </span>
                    <span className="time-value">{formState.response.responseTime}ms</span>
                  </span>
                )}
              </div>
              <pre className="response-body">{formatOutput(formState.response.data)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Form;