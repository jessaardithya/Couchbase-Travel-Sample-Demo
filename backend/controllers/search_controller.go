package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"super-app-demo/backend/config"

	"github.com/couchbase/gocb/v2"
	"github.com/couchbase/gocb/v2/search"
	"github.com/couchbase/gocb/v2/vector"
)

func SearchGlobal(w http.ResponseWriter, r *http.Request) {
	queryTerm := r.URL.Query().Get("q")
	if queryTerm == "" {
		http.Error(w, "Query parameter 'q' is required", 400)
		return
	}

	log.Printf("🔎 Searching for: %s", queryTerm)

	// ---------------------------------------------------------
	// 1. Build Text Query (Tiered Logic)
	// ---------------------------------------------------------

	// Tier 1: City & Country (High Boost)
	cityQuery := search.NewMatchQuery(queryTerm)
	cityQuery.Field("city")
	cityQuery.Boost(10.0)

	countryQuery := search.NewMatchQuery(queryTerm)
	countryQuery.Field("country")
	countryQuery.Boost(10.0)

	// Tier 2: Names (High Boost - Increased to beat country match)
	nameQuery := search.NewMatchQuery(queryTerm)
	nameQuery.Field("name")
	nameQuery.Fuzziness(1)
	nameQuery.Boost(15.0) // Increased from 5.0 to 15.0

	// Tier 3: Codes (FAA/IATA) - Very High Boost for exact match
	faaQuery := search.NewMatchQuery(queryTerm)
	faaQuery.Field("faa")
	faaQuery.Boost(20.0)

	iataQuery := search.NewMatchQuery(queryTerm)
	iataQuery.Field("iata")
	iataQuery.Boost(20.0)

	// Tier 4: Description (Low Boost)
	descQuery := search.NewMatchQuery(queryTerm)
	descQuery.Field("description")
	descQuery.Fuzziness(1)

	// Contextual Logic Setup
	queryLower := strings.ToLower(queryTerm)
	queryLen := len(strings.TrimSpace(queryTerm))

	// context flags
	shouldBoostHotels := false
	shouldBoostAirlines := false
	shouldBoostAirports := false

	// 1. Hotel Context
	accommodationKeywords := []string{"sleep", "stay", "hotel", "inn", "resort", "motel", "bnb"}
	for _, kw := range accommodationKeywords {
		if strings.Contains(queryLower, kw) {
			shouldBoostHotels = true
			break
		}
	}

	// 2. Airline Context
	airlineKeywords := []string{"airline", "flight", "fly", "airway"}
	for _, kw := range airlineKeywords {
		if strings.Contains(queryLower, kw) {
			shouldBoostAirlines = true
			break
		}
	}

	// 3. Airport Context (Heuristic: 3 letters = Airport Code)
	if queryLen == 3 {
		shouldBoostAirports = true
	}

	// Combine Text Queries
	disjunctionQueries := []search.Query{
		cityQuery,
		countryQuery,
		nameQuery, // Higher boost now
		faaQuery,  // New
		iataQuery, // New
		descQuery,
	}

	// Apply Context Boosts
	if shouldBoostHotels {
		log.Println("🛏️ Accommodation context detected. Boosting hotels.")
		q := search.NewMatchQuery("hotel")
		q.Field("type")
		q.Boost(20.0)
		disjunctionQueries = append(disjunctionQueries, q)
	}

	if shouldBoostAirlines {
		log.Println("✈️ Airline context detected. Boosting airlines.")
		q := search.NewMatchQuery("airline")
		q.Field("type")
		q.Boost(20.0)
		disjunctionQueries = append(disjunctionQueries, q)
	}

	if shouldBoostAirports {
		log.Println("🛫 Airport code pattern detected. Boosting airports.")
		q := search.NewMatchQuery("airport")
		q.Field("type")
		q.Boost(20.0)
		disjunctionQueries = append(disjunctionQueries, q)
	}

	finalTextQuery := search.NewDisjunctionQuery(disjunctionQueries...)

	// ---------------------------------------------------------
	// 2. Build Search Options (With Vector Logic)
	// ---------------------------------------------------------

	// Default Options
	searchOptions := &gocb.SearchOptions{
		Limit: 20,
		Highlight: &gocb.SearchHighlightOptions{
			Style:  gocb.SearchHighlightStyle("html"),
			Fields: []string{"description", "name", "city"},
		},
		Fields: []string{"name", "city", "country", "type", "description", "score"},
	}

	// Generate Vector
	queryVector, err := GetVector(queryTerm)

	// Initialize SearchRequest (Text Query is always present)
	searchReq := gocb.SearchRequest{
		SearchQuery: finalTextQuery,
	}

	if err != nil {
		log.Printf("Vector Generation Failed (Fallback to Text Only): %v", err)
	} else {
		log.Println("Vector Generated. Running Hybrid Search.")

		// Define Vector Query
		vecQuery := vector.NewQuery("embedding", queryVector)
		vecQuery.NumCandidates(20)
		vecQuery.Boost(2.0)

		// Attach to Request using vector.NewSearch
		searchReq.VectorSearch = vector.NewSearch([]*vector.Query{vecQuery}, nil)
	}

	// ---------------------------------------------------------
	// 3. Execute Search
	// ---------------------------------------------------------

	result, err := config.InventoryScope.Search(
		"def_global_search",
		searchReq,
		searchOptions,
	)

	if err != nil {
		http.Error(w, fmt.Sprintf("Search failed: %v", err), 500)
		return
	}

	// ---------------------------------------------------------
	// 4. Process Results
	// ---------------------------------------------------------
	var hits []map[string]interface{}

	for result.Next() {
		row := result.Row()

		var fields map[string]interface{}
		_ = row.Fields(&fields)

		// Helper to safely get string fields
		getString := func(key string) string {
			if val, ok := fields[key].(string); ok {
				return val
			}
			return ""
		}

		docType := getString("type")

		// STRICT FILTERING BASED ON CONTEXT
		// 1. If searching for Airlines (e.g. "United Airlines"), exclude hotels
		if shouldBoostAirlines && docType == "hotel" {
			continue
		}
		// 2. If searching for Accommodation (e.g. "place to sleep"), exclude airports and airlines
		if shouldBoostHotels && (docType == "airport" || docType == "airline") {
			continue
		}
		// 3. If searching for Airports (e.g. "SFO"), exclude hotels
		if shouldBoostAirports && docType == "hotel" {
			continue
		}

		// Resolve Name & Description from fragments or raw fields
		displayName := getString("name")
		if frags, ok := row.Fragments["name"]; ok && len(frags) > 0 {
			displayName = frags[0]
		}

		displayDesc := getString("description")
		if frags, ok := row.Fragments["description"]; ok && len(frags) > 0 {
			displayDesc = frags[0] + "..."
		} else if len(displayDesc) > 150 {
			displayDesc = displayDesc[:150] + "..."
		}

		hit := map[string]interface{}{
			"id":          row.ID,
			"score":       row.Score,
			"type":        getString("type"),
			"name":        displayName,
			"city":        getString("city"),
			"country":     getString("country"),
			"description": displayDesc,
		}
		hits = append(hits, hit)
	}

	w.Header().Set("Content-Type", "application/json")
	if hits == nil {
		hits = []map[string]interface{}{}
	}
	json.NewEncoder(w).Encode(hits)
}
