package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"super-app-demo/backend/config"
	"super-app-demo/backend/models"

	"github.com/couchbase/gocb/v2"
)

func SearchFlights(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	if from == "" || to == "" {
		http.Error(w, "Please provide 'From' and 'To' airports", http.StatusBadRequest)
		return
	}

	query := `
		SELECT r.airline, 
		       r.sourceairport, 
		       r.destinationairport, 
		       r.stops, 
		       r.equipment,
		       r.schedule[0].flight AS flight 
		FROM ` + "`travel-sample`" + `.inventory.route r 
		WHERE r.sourceairport = $1 
		AND r.destinationairport = $2 
		LIMIT 20;
	`

	rows, err := config.Cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{from, to},
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("Query failed: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var flights []models.Flight
	for rows.Next() {
		var flight models.Flight
		if err := rows.Row(&flight); err != nil {
			continue
		}
		flights = append(flights, flight)

	}

	w.Header().Set("Content-type", "application/json")
	json.NewEncoder(w).Encode(flights)
}
