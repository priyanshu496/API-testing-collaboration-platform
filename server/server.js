import express from "express";
import mongoose, { Mongoose } from "mongoose";
import axios from "axios";
import cors from "cors";


const app = express();
app.use(cors());
app.use(express.json({limit: '20mb'}));



const port = process.env.PORT || 5000;

mongoose.connect('mongodb://127.0.0.1:27017/userdb') //will change in final run
.then(()=>{
  console.log("Conncection Success!!!");
  console.log("Connected to database: ", mongoose.connection.name);
})
.catch((error) => {
  console.log("Connection failed", error);
});

const dataSchema = new mongoose.Schema({

  //request details
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
    // type: Mongoose.Schema.types.Mixed ------> case sensitive mistake
    type: mongoose.Schema.Types.Mixed //write way
  },
  //response data

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

  //error data

  error: {
    type: Boolean,
    default:false
  },
  errorDetails: {
    type: String
  },
  
  //metadata

  timeStamp: {
    type: Date,
    default: Date.now
  }
})

const Apidb = mongoose.model('Apidb', dataSchema);//will change in final run


//testing api endpoint with database connection varification
app.get('/testdb', async (req, res) => {//will change in final run

  try{

    const testdata = new Apidb({
      method: 'GET',
      url: 'http://test12235.com',
      responseStatus: 200,
      responseData: {message: 'success is on the way'},
      responseTime: 100
    })

    const result = await testdata.save()
    console.log("Data saved", result)
    

    res.status(200).json({
        success: true,
        saveData: result
    })
}catch(err){
    console.log("Error occured", err);
    res.status(500).json({err: err.message});
}
});

//handling api requests
//will change in final run
app.post('/api/test',async (req, res) => {


  const startTime = Date.now();
  let apitest;
 try{

  const {method, url, body, headers} = req.body;

  //input validation
  if(!method || !url){
    return res.status(400).json({
      error: 'Request method and url required!!!'
    })
  }
  //create a new doccument in the database using the already declared variable apitest

  apitest = new Apidb({
    method: method.toUpperCase(),
    url: url,
    requestHeader: headers || {},
    requestBody: body || null,
    timeStamp: new Date()
  });

  //make the api request call using axios

  try{
    const config = {
      method: method.toLowerCase(),
      url: url,
      Timeout: 15000,
      headers: headers || {}
    }

    if(['PUT', 'POST', 'PATCH'].includes(method.toLowerCase()) && body){
      config.data = body;
    }
    console.log('Request configuration: ', {...config, data: config.data ? 'Body data Present' : 'No body data'});//condition ? value_if_true : value_if_false(ternary operator used)

    const resp = await axios(config); // axios request execution

    //calculate the response time

    const responseTime = Date.now() - startTime;

    //updating apitest document with response data
    apitest.responseStatus = resp.status;
    apitest.responseHeaders = resp.headers;
    apitest.responseData = resp.data;
    apitest.responseTime = responseTime;
    apitest.error = false;
    

    //save document to database with proper error handling
    console.log('Saving data to database');
    try{
      const saveData =  apitest.save();
      console.log('Data saved: ', saveData._id);
    }catch(saveError){
      console.log("Saving failed ", saveError);
    }

    //return response data to client
    return res.status(200).json({
      status: resp.status,
      data: resp.data,
      responseTime: responseTime,
      headers: resp.headers,
      saved: true
    });
    
  }catch(error){
    console.log("Error making API request: ", error.message);

    //response time for errors
    const responseTime = Date.now()-startTime;
    let errorDetails = {
      error: true,
      message: error.message
    };
    apitest.error = true;
    apitest.errorMessage = error.message;
    apitest.responseTime = responseTime;

    if(error.resp){
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('response data: ', error.message.data);
      console.error('Response status:', error.response.status);

      errorDetails.status = error.resp.status;
      errorDetails.data = error.resp.data;
      apitest.responseStatus = error.resp.status;
      apitest.responseHeaders = error.resp.headers;
      apitest.responseData = error.resp.data;
    }else if(error.request) //accessing the error object of axios and its request property

    {
      //request made but no response received
      console.error('No response received');
      errorDetails.status  = 0;
      errorDetails.data = 'No response received from the server!!!';
      apitest.responseStatus = 0;
      apitest.responseData = {error : 'No response from the server'};
    }else{
      //something happend in setting up the request that triggered an error
      apitest.responseStatus = 500;
      apitest.responseData = {error: error.message};
    }
    //saving error data to the database
    try{
      const saveData = await apitest.save();
      console.log("Error data saved to the database: ", saveData._id);
    }catch(saveError){
      console.error('Failed to save error data!!!', saveError);
    }
    return res.status(200).json({errorDetails});
  }

 }catch(error){
  console.error('Server Error: ', error);
  if(apitest){
    apitest.error = true;
    apitest.errorMessage = 'Server error';
    apitest.responseStatus = 500;
    apitest.responseTime = Date.now() - startTime;
    try{
      const saveData = await apitest.save();
      console.log("Error data saved: ", saveData);
    }catch(saveError){
      console.error('Failed to save the error data to the database: ', saveError);
    }
  }
  return res.status(500).json({error: 'Internal Server error', details: error.message});
 }
});

//endpoint to retrieve test history

app.get('api/history' , async (req, res) => {
  try{
    const history = await apitest.find()
    .sort({timeStamp: -1})
    .limit(50);
    res.status(200).json(history);
  }catch(error){
    console.error('Error fetching history: ', error);
    res.status(500).json({error: 'Failed to fetch test history'});
  }
});

// endpoint to get a specific test by id
app.get('api/test/:id', async (req, res) => {
  try{
    const test  = await apitest.findById(req.params.id);
    if(!test){
      return res.status(404).json({error: 'Id not found'});
    }
    res.status(200).json(test);
  } catch(error){
    console.error('Error fetching test: ', error);
    res.status(500).json({error: 'Failed to fetch test'});
  }
});

app.listen(port, () =>{
  console.log("Server running at port: ", port)
  console.log(`API Testing Platform is ready! Visit http://localhost:${port}/test-db to verify database connection`);
});
