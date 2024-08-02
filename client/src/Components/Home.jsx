import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Friends from "./Friends";
import Servers from "./Servers";

function Home() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // if (loading) {
  //   return <div>Loading...</div>;
  // }

  if (!session) {
    return <div>no session</div>;
  }

  return (
    <div className="">
      <div className="flex flex-row gap-20 pb-20">
        <Link to="/">Soon(tm)</Link>
        <span> | </span>
        <Link to="/VideoChat">Video Chat</Link>
        <span> | </span>
        <div> stuff </div>
        <span> | </span>
        <div> more stuff </div>
      </div>
      <div className="grid grid-cols-3">
        <div className="">
          <Friends session={session.user.id} />
        </div>
        <div>
          <h2> the feeeeeeeeed </h2>
        </div>
        <div>
          <Servers session={session.user.id} />
        </div>
      </div>
    </div>
  );
}

export default Home;
