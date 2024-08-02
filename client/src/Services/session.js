import { supabase } from "../supabaseClient";

function getSession() {
  return supabase.auth.getSession();
}

function getID() {
  return supabase.auth.session().user.id;
}

export default getID;
