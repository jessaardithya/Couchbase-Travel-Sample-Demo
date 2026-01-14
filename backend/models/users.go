package models

type User struct {
	Type       string   `json:"type"`
	Username   string   `json:"username"`
	Password   string   `json:"password,omitempty"`
	FullName   string   `json:"full_name"`
	BookingIDs []string `json:"booking_ids"`
}
