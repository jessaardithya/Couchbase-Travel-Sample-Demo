package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"super-app-demo/backend/config"

	"github.com/couchbase/gocb/v2"
	"github.com/couchbase/gocb/v2/search"
)

func SearchGlobal(w http.ResponseWriter, r *http.Request) {
	queryTerm := r.URL.Query().Get("q")
	if queryTerm == "" {
		http.Error(w, "Query parameter 'q' is required", 400)
		return
	}

	// 1. Build Query with Tiered Relevance
	// Tier 1: City & Country (High Boost) - Uses MatchQuery to support typing (e.g. "United S")
	cityQuery := search.NewMatchQuery(queryTerm)
	cityQuery.Field("city")
	cityQuery.Boost(10.0)

	countryQuery := search.NewMatchQuery(queryTerm)
	countryQuery.Field("country")
	countryQuery.Boost(10.0)

	// Tier 2: Names (Medium Boost) - Allows typos
	nameQuery := search.NewMatchQuery(queryTerm)
	nameQuery.Field("name")
	nameQuery.Fuzziness(1)
	nameQuery.Boost(5.0)

	airportQuery := search.NewMatchQuery(queryTerm)
	airportQuery.Field("airportname")
	airportQuery.Fuzziness(1)
	airportQuery.Boost(5.0)

	// Tier 3: Description (Low Boost) - Context search
	descQuery := search.NewMatchQuery(queryTerm)
	descQuery.Field("description")
	descQuery.Fuzziness(1)

	finalQuery := search.NewDisjunctionQuery(
		cityQuery,
		countryQuery,
		nameQuery,
		airportQuery,
		descQuery,
	)

	// 2. Define Search Options
	searchOptions := &gocb.SearchOptions{
		Limit: 10,
		Highlight: &gocb.SearchHighlightOptions{
			Style:  gocb.SearchHighlightStyle("html"),
			Fields: []string{"description", "name", "airportname"},
		},
		Fields: []string{"name", "airportname", "city", "country", "type", "description"},
	}

	// 3. Execute Search
	result, err := config.InventoryScope.Search(
		"def_global_search",
		gocb.SearchRequest{
			SearchQuery: finalQuery,
		},
		searchOptions,
	)

	if err != nil {
		http.Error(w, fmt.Sprintf("Search failed: %v", err), 500)
		return
	}

	var hits []map[string]interface{}

	for result.Next() {
		row := result.Row()

		// Filter noise (low relevance results)
		if row.Score < 0.01 {
			continue
		}

		var fields map[string]interface{}
		_ = row.Fields(&fields)

		// Resolve Name (Use Highlighted Fragment if available, otherwise raw field)
		displayName := ""
		if val, ok := fields["name"].(string); ok {
			displayName = val
		} else if val, ok := fields["airportname"].(string); ok {
			displayName = val
		}

		if frags, ok := row.Fragments["name"]; ok && len(frags) > 0 {
			displayName = frags[0]
		} else if frags, ok := row.Fragments["airportname"]; ok && len(frags) > 0 {
			displayName = frags[0]
		}

		// Resolve Description (Use Highlighted Fragment if available, otherwise truncate raw field)
		displayDesc := ""
		if frags, ok := row.Fragments["description"]; ok && len(frags) > 0 {
			displayDesc = frags[0] + "..."
		} else if val, ok := fields["description"].(string); ok {
			fullDesc := val
			if len(fullDesc) > 150 {
				displayDesc = fullDesc[:150] + "..."
			} else {
				displayDesc = fullDesc
			}
		}

		hit := map[string]interface{}{
			"id":          row.ID,
			"score":       row.Score,
			"type":        fields["type"],
			"name":        displayName,
			"city":        fields["city"],
			"country":     fields["country"],
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
