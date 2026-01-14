package models

type Booking struct {
	Type        string `json:"type"`
	ID          string `json:"id"`
	Username    string `json:"username"`
	FlightInfo  Flight `json:"flight_info"`
	Status      string `json:"status"`
	BookingDate string `json:"booking_date"`
}
