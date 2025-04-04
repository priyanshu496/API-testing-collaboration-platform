import React from "react";
import Tabs from "./components/Tabs";
import "./App.css";

const App = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>API Testing & Collaboration Platform</h1>
        <button className="login">Login</button>
      </header>
      <main className="app-content">
        <Tabs />
      </main>
    </div>
  );
};

export default App;