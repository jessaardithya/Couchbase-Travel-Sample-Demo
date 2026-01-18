package routes

import (
	"net/http"
	"super-app-demo/backend/controllers"
	"super-app-demo/backend/controllers/auth"
)

func SetupRoutes() {
	http.HandleFunc("/api/airline", controllers.GetAirlineByID)
	http.HandleFunc("/api/hotel", controllers.GetHotelByID)
	http.HandleFunc("/api/admin/backfill-vectors", controllers.BackfillVectors)

	http.HandleFunc("/api/flight", controllers.SearchFlights)
	http.HandleFunc("/api/search", controllers.SearchGlobal)

	http.HandleFunc("/api/book", controllers.BookFlight)
	http.HandleFunc("/api/my-bookings", controllers.GetMyBookings)

	// AUTH
	http.HandleFunc("/api/auth/register", auth.Register)
	http.HandleFunc("/api/auth/login", auth.Login)
}
