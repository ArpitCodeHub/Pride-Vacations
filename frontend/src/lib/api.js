import axios from "axios";
import { supabase } from "./supabase";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

client.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data?.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

export const api = client;
