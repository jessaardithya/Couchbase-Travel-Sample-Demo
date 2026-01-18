package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"super-app-demo/backend/config"
	"super-app-demo/backend/models"

	"github.com/couchbase/gocb/v2"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
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

func GetVector(description string) ([]float32, error) {
	ctx := context.Background()
	apiKey := os.Getenv("GOOGLE_API_KEY")

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, err
	}
	defer client.Close()

	model := client.EmbeddingModel("text-embedding-004")

	res, err := model.EmbedContent(ctx, genai.Text(description))
	if err != nil {
		return nil, err
	}

	return res.Embedding.Values, nil

}

func BackfillVectors(w http.ResponseWriter, r *http.Request) {
	query := "SELECT meta().id, description FROM `travel-sample`.inventory.hotel WHERE type = 'hotel' AND description IS NOT MISSING AND embedding IS MISSING LIMIT 500"

	rows, err := config.Cluster.Query(query, nil)
	if err != nil {
		http.Error(w, fmt.Sprintf("Query Failed: %v", err), http.StatusInternalServerError)
		return
	}

	var count int
	for rows.Next() {
		var doc struct {
			ID          string `json:"id"`
			Description string `json:"description"`
		}
		rows.Row(&doc)
		log.Printf("Processing %s...", doc.ID)
		vector, err := GetVector(doc.Description)

		if err != nil {
			log.Printf("Failed to vectorize %s: %v", doc.ID, err)
			continue
		}

		_, err = config.InventoryScope.Collection("hotel").MutateIn(doc.ID, []gocb.MutateInSpec{
			gocb.UpsertSpec("embedding", vector, nil),
		}, nil)

		if err != nil {
			log.Printf("Failed to save %s: %v", doc.ID, err)
		} else {
			count++
		}

	}

	w.Write([]byte(fmt.Sprintf("Batch Complete. Updated %d hotels.", count)))
}
