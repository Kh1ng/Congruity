import React from "react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="bg-slate-900">
      <h1>Welcome to the Home page!</h1>
      <Link to="/App">Account</Link>
      <Link to="/VideoChat">Video Chat</Link>
      <h1 className="text-3xl font-bold underline">Hello world!</h1>
    </div>
  );
}

export default Home;
