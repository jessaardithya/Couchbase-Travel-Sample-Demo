package models

type Airline struct {
	ID       int    `json:"id"`
	Type     string `json:"type"`
	Name     string `json:"name"`
	IATA     string `json:"iata"`
	ICAO     string `json:"icao"`
	Callsign string `json:"callsign"`
	Country  string `json:"country"`
}
