import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  const [reqMethod, setReqMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleMethodChange = (e) => {
    setReqMethod(e.target.value);
  };

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
  };

  const handleBodyChange = (e) => {
    setRequestBody(e.target.value);
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!url) {
      setError("URL is required");
      return;
    }

    // Parse the request body if it exists and is not empty
    let parsedBody = null;
    if (requestBody && ['POST', 'PUT', 'PATCH'].includes(reqMethod)) {
      try {
        parsedBody = JSON.parse(requestBody);
      } catch (e) {
        console.log(e)
        setError("Invalid JSON in request body");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      console.log(`Sending ${reqMethod} request to ${url}`, parsedBody ? "with body" : "without body");
      
      // Make request to our backend server
      const result = await axios.post('http://localhost:5000/api/test', {
        method: reqMethod,
        url: url,
        body: parsedBody
      });

      // Set the response
      setResponse(result.data);
      console.log("Response received:", result.data);
    } catch (err) {
      console.error("Request failed:", err);
      setError(err.response?.data?.error || err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  // Format JSON for display
  const formatOutput = (data) => {
    if (!data) return null;
    
    try {
      if (typeof data === 'object') {
        return JSON.stringify(data, null, 2);
      }
      return data;
    } catch (e) {
      console.log('error', e);
      return String(data);
    }
  };

  return (
    <div className="mainpage">
      <h1>API Testing Platform</h1>

      <div className="mainform">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="input-group">
            <label htmlFor="reqMethod">REQUEST </label>
            <span>: </span>
            <select
              id="reqMethod"
              value={reqMethod}
              onChange={handleMethodChange}
              className="req"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="url" className="url">URL: </label>
            <input
              type="text"
              id="url"
              className="uri"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://api.example.com/endpoint"
            />
          </div>

          {['POST', 'PUT', 'PATCH'].includes(reqMethod) && (
            <div className="input-group">
              <label htmlFor="requestBody">Request Body (JSON): </label>
              <textarea
                id="requestBody"
                className="body"
                value={requestBody}
                onChange={handleBodyChange}
                placeholder='{"key": "value"}'
                rows={5}
              />
            </div>
          )}
        </form>

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'SENDING...' : 'SEND'}
        </button>
      </div>

      <h4>OUTPUT</h4>
      <div className="output">
        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}
        {response && (
          <div>
            <div className="response-meta">
              <p><strong>Status:</strong> {response.status}</p>
              {response.responseTime && (
                <p><strong>Response Time:</strong> {response.responseTime}ms</p>
              )}
            </div>
            <pre>{formatOutput(response.data)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;