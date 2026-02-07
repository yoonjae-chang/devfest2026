"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { backendApi } from "@/lib/api";

export default function Page() {
    const [response, setResponse] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const testBackend = async () => {
        setLoading(true);
        setError(null);
        setResponse("");
        
        try {
            const data = await backendApi.getRoot();
            setResponse(JSON.stringify(data, null, 2));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
            setError(errorMessage);
            
            // If authentication error, suggest logging in
            if (errorMessage.includes("Authentication required") || errorMessage.includes("Authentication failed")) {
                setError(`${errorMessage}\n\nPlease make sure you are logged in.`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white text-gray-900 overflow-hidden m-40">
            <h1 className="text-4xl font-bold">Testing</h1>
            <p className="text-lg">This is a test page</p>
            <Button 
                variant="outline" 
                className="mt-4" 
                onClick={testBackend}
                disabled={loading}
            >
                {loading ? "Testing..." : "Test Backend Connection"}
            </Button>
            
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 font-semibold">Error:</p>
                    <p className="text-red-600">{error}</p>
                </div>
            )}
            
            {response && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 font-semibold mb-2">Response:</p>
                    <pre className="text-sm text-green-700 overflow-auto">{response}</pre>
                </div>
            )}
        </div>
    );
}