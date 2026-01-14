package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"super-app-demo/backend/config"
	"super-app-demo/backend/models"
)

func GetHotelByID(w http.ResponseWriter, r *http.Request) {
	hotelID := r.URL.Query().Get("id")

	if hotelID == "" {
		http.Error(w, "Missing ID Parameter", http.StatusBadRequest)
		return
	}

	docKey := fmt.Sprintf("hotel_%s", hotelID)

	getResult, err := config.InventoryScope.Collection("hotel").Get(docKey, nil)
	if err != nil {
		http.Error(w, fmt.Sprintf("Hotel not found: %v", err), http.StatusNotFound)
		return
	}

	var hotel models.Hotel
	err = getResult.Content(&hotel)

	if err != nil {
		http.Error(w, "Data Corrupted", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-type", "application/json")
	json.NewEncoder(w).Encode(hotel)
}
