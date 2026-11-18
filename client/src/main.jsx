import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";
import App from "./App.jsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        // Never retry client errors (400, 401, 403, 404, 429)
        if (status && status >= 400 && status < 500) {
          return false;
        }
        // Axios already retries transient GET errors up to 2 times; limit RQ retry to 1
        return failureCount < 1;
      }
    },
    mutations: {
      // Never auto-retry non-idempotent POST/PUT/DELETE mutations
      retry: false
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
