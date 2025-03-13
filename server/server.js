import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const port = process.env.PORT || 5000;

// MongoDB connection with more detailed error handling
mongoose.connect('mongodb://127.0.0.1:27017/apidata', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("Database connection successful!!!");
  console.log("Connected to database:", mongoose.connection.name);
  
  // List available collections
  mongoose.connection.db.listCollections().toArray(function(err, collections) {
    if (err) {
      console.log('Error getting collections:', err);
    } else {
      console.log('Available collections:', collections.map(c => c.name));
    }
  });
})
.catch((err) => {
  console.log("Connection failed!!!", err);
});

// Enhanced schema for storing complete API test data
const dataSchema = new mongoose.Schema({
  // Request details
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  url: {
    type: String,
    required: true
  },
  requestHeaders: {
    type: Object,
    default: {}
  },
  requestBody: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Response details
  responseStatus: {
    type: Number
  },
  responseHeaders: {
    type: Object,
    default: {}
  },
  responseData: {
    type: mongoose.Schema.Types.Mixed
  },
  responseTime: {
    type: Number
  },
  
  // Error details (if any)
  error: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String
  },
  
  // Metadata
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const APITest = mongoose.model('APITest', dataSchema);

// Test endpoint to verify database connection
app.get('/test-db', async (req, res) => {
  try {
    const testData = new APITest({
      method: 'GET',
      url: 'http://test.com',
      responseStatus: 200,
      responseData: { message: 'Test successful' },
      responseTime: 100
    });
    
    const result = await testData.save();
    console.log('Test data saved successfully:', result);
    
    res.status(200).json({
      success: true,
      savedData: result
    });
  } catch (error) {
    console.error('Test DB insertion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to handle API testing requests
app.post('/api/test', async (req, res) => {
  const startTime = Date.now();
  let apiTest;
  
  try {
    // Extract request method, URL, and body from the request body
    const { method, url, body, headers } = req.body;
    
    console.log(`Received request: ${method} ${url}`);
    if (body) {
      console.log('With body:', typeof body === 'object' ? 'Object' : body);
    }
    
    // Validate inputs
    if (!method || !url) {
      return res.status(400).json({ 
        error: 'Request method and URL are required' 
      });
    }
    
    // Create a new API test document - we'll update it as we go
    apiTest = new APITest({
      method: method.toUpperCase(),
      url: url,
      requestHeaders: headers || {},
      requestBody: body || null,
      timestamp: new Date()
    });
    
    // Make the requested API call using axios
    try {
      console.log(`Attempting ${method.toLowerCase()} request to ${url}`);
      
      // Configure axios request
      const config = {
        method: method.toLowerCase(),
        url: url,
        timeout: 15000, // 15-second timeout
        headers: headers || {}
      };
      
      // Add body for appropriate methods
      if (['post', 'put', 'patch'].includes(method.toLowerCase()) && body) {
        config.data = body;
      }
      
      console.log('Request configuration:', {
        ...config,
        data: config.data ? 'Body data present' : 'No body data'
      });
      
      // Execute the request
      const response = await axios(config);
      console.log(`${method} request successful with status ${response.status}`);
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Update API test document with response data
      apiTest.responseStatus = response.status;
      apiTest.responseHeaders = response.headers;
      apiTest.responseData = response.data;
      apiTest.responseTime = responseTime;
      apiTest.error = false;
      
      // Save to database with proper error handling
      console.log("Saving API test data to database...");
      try {
        const savedData = await apiTest.save();
        console.log("API test data saved successfully:", savedData._id);
      } catch (saveError) {
        console.error("Failed to save API test data:", saveError);
        // We'll still return the response to the client
      }
      
      // Send the response back to the client
      return res.status(200).json({
        status: response.status,
        data: response.data,
        responseTime: responseTime,
        headers: response.headers,
        saved: true
      });
      
    } catch (error) {
      // Handle errors in the API call
      console.error('Error making API request:', error.message);
      
      // Calculate response time even for errors
      const responseTime = Date.now() - startTime;
      
      // Prepare error details
      let errorDetails = {
        error: true,
        message: error.message,
      };
      
      // Update API test document with error information
      apiTest.error = true;
      apiTest.errorMessage = error.message;
      apiTest.responseTime = responseTime;
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        errorDetails.status = error.response.status;
        errorDetails.data = error.response.data;
        
        apiTest.responseStatus = error.response.status;
        apiTest.responseHeaders = error.response.headers;
        apiTest.responseData = error.response.data;
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received');
        errorDetails.status = 0;
        errorDetails.data = "No response received from server";
        
        apiTest.responseStatus = 0;
        apiTest.responseData = { error: "No response received from server" };
      } else {
        // Something happened in setting up the request that triggered an Error
        apiTest.responseStatus = 500;
        apiTest.responseData = { error: error.message };
      }
      
      // Save error data to database
      try {
        const savedData = await apiTest.save();
        console.log("Error data saved to database:", savedData._id);
      } catch (saveError) {
        console.error("Failed to save error data to database:", saveError);
      }
      
      return res.status(200).json(errorDetails); // Return 200 to client with error info
    }
    
  } catch (error) {
    console.error('Server error:', error);
    
    // Try to save the error information if we have an API test document
    if (apiTest) {
      apiTest.error = true;
      apiTest.errorMessage = `Server error: ${error.message}`;
      apiTest.responseStatus = 500;
      apiTest.responseTime = Date.now() - startTime;
      
      try {
        await apiTest.save();
        console.log("Server error saved to database");
      } catch (saveError) {
        console.error("Failed to save server error to database:", saveError);
      }
    }
    
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Endpoint to retrieve test history
app.get('/api/history', async (req, res) => {
  try {
    const history = await APITest.find()
      .sort({ timestamp: -1 })
      .limit(50);
      
    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch test history' });
  }
});

// Endpoint to get a specific test by ID
app.get('/api/test/:id', async (req, res) => {
  try {
    const test = await APITest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.status(200).json(test);
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

app.listen(port, () => {
  console.log(`Server running at port ${port}`);
  console.log(`API Testing Platform is ready! Visit http://localhost:${port}/test-db to verify database connection`);
});