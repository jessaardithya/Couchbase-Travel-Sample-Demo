package main

import (
	"fmt"
	"log"
	"net/http"

	"super-app-demo/backend/config"
	"super-app-demo/backend/routes"
)

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	config.ConnectDB()
	routes.SetupRoutes()

	port := ":8080"
	fmt.Printf("\n✅ Server is running at: http://localhost%s\n", port)

	// Block here and listen for requests
	err := http.ListenAndServe(port, enableCORS(http.DefaultServeMux))
	if err != nil {
		log.Fatal("Error starting server: ", err)
	}
}
