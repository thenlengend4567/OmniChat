"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<{ error: any }>;
  signUp: (credentials: SignUpWithPasswordCredentials) => Promise<{ error: any; user: User | null }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Utility helper to synchronize Supabase session details into secure browser cookies.
 * This guarantees the server-side Next.js route handlers or middleware can authenticate requests.
 */
const setSessionCookies = (session: Session | null) => {
  if (typeof window === "undefined") return;

  if (session) {
    // 7-day session token cookie
    const maxAge = 60 * 60 * 24 * 7; 
    document.cookie = `sb-access-token=${encodeURIComponent(session.access_token)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
    if (session.refresh_token) {
      document.cookie = `sb-refresh-token=${encodeURIComponent(session.refresh_token)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
    }
  } else {
    // Clear cookies upon logout
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";
    document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    // Load initial session on mount
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setSessionCookies(initialSession);
        }
      } catch (err) {
        console.error("Supabase Auth Context initialization error:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen to real-time authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (isMounted) {
          console.log(`Auth state change event: ${event}`);
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setSessionCookies(currentSession);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Performs an actual email/password authentication using Supabase Auth.
   */
  const signIn = async (credentials: SignInWithPasswordCredentials) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error("Sign-in failed:", error.message || error);
      return { error };
    }
  };

  /**
   * Performs an actual user registration using Supabase Auth.
   */
  const signUp = async (credentials: SignUpWithPasswordCredentials) => {
    try {
      const { data, error } = await supabase.auth.signUp(credentials);
      if (error) throw error;
      return { error: null, user: data.user };
    } catch (error: any) {
      console.error("Sign-up failed:", error.message || error);
      return { error, user: null };
    }
  };

  /**
   * Revokes the current Supabase session and logs the user out.
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Clear cookies immediately
      setSessionCookies(null);
      return { error: null };
    } catch (error: any) {
      console.error("Sign-out failed:", error.message || error);
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
};
