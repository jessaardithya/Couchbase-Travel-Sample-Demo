package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"super-app-demo/backend/config"
	"super-app-demo/backend/models"
)

func GetAirlineByID(w http.ResponseWriter, r *http.Request) {
	airlineID := r.URL.Query().Get("id")

	if airlineID == "" {
		http.Error(w, "Missing ID Parameter", http.StatusBadRequest)
		return
	}

	docKey := fmt.Sprintf("airline_%s", airlineID)

	getResult, err := config.InventoryScope.Collection("airline").Get(docKey, nil)
	if err != nil {
		http.Error(w, fmt.Sprintf("Airline not found: %v", err), http.StatusNotFound)
		return
	}

	var airline models.Airline
	err = getResult.Content(&airline)

	if err != nil {
		http.Error(w, "Data Corrupted", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-type", "application/json")
	json.NewEncoder(w).Encode(airline)

}
