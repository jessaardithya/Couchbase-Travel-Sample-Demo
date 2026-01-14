package models

type Flight struct {
	ID          string `json:"id,omitempty"`
	Airline     string `json:"airline"`
	FlightNum   string `json:"flight"`
	Source      string `json:"sourceairport"`
	Destination string `json:"destinationairport"`
	Stops       int    `json:"stops"`
	Equipment   string `json:"equipment"`
}
