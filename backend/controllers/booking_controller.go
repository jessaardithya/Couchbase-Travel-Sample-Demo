package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"super-app-demo/backend/config"
	"super-app-demo/backend/controllers/auth"
	"super-app-demo/backend/models"
	"time"

	"github.com/couchbase/gocb/v2"
	"github.com/golang-jwt/jwt/v5"
)

func BookFlight(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Unauthorized: No token provided", 401)
		return
	}

	tokenString := strings.Replace(authHeader, "Bearer ", "", 1)

	token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return auth.SecretKey, nil
	})

	var username string

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		username = claims["username"].(string)
	} else {
		http.Error(w, "Unauthorized: Invalid token", 401)
		return
	}

	var flight models.Flight
	err := json.NewDecoder(r.Body).Decode(&flight)
	if err != nil {
		http.Error(w, "Invalid data", http.StatusBadRequest)
		return
	}

	ticketID := "ticket_" + strconv.Itoa(rand.Intn(100000))

	booking := models.Booking{
		Type:        "booking",
		ID:          ticketID,
		Username:    username,
		FlightInfo:  flight,
		Status:      "confirmed",
		BookingDate: time.Now().Format("2006-01-02 15:04:05"),
	}

	_, err = config.InventoryScope.Collection("bookings").Insert(ticketID, booking, nil)
	if err != nil {
		http.Error(w, fmt.Sprintf("Booking save failed: %v", err), 500)
		return
	}

	userKey := "user::" + username
	userCol := config.InventoryScope.Collection("users")

	ops := []gocb.MutateInSpec{
		gocb.ArrayAppendSpec("booking_ids", ticketID, &gocb.ArrayAppendSpecOptions{
			CreatePath: true,
		}),
	}

	_, err = userCol.MutateIn(userKey, ops, nil)

	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			newUser := models.User{
				Type:       "user",
				Username:   username,
				BookingIDs: []string{ticketID},
			}
			_, err = userCol.Insert(userKey, newUser, nil)
			if err != nil {
				fmt.Println("Error creating user:", err)
			}
		} else {
			fmt.Println("Error updating user list:", err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message":    "Booking Confirmed!",
		"ticket_id":  ticketID,
		"booked_for": username,
	})
}

func GetMyBookings(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Unauthorized", 403)
		return
	}

	tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
	token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// FIX: Access it via the imported package name 'auth'
		return auth.SecretKey, nil
	})

	var username string
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		username = claims["username"].(string)
	} else {
		http.Error(w, "Invalid Token", 401)
		return
	}

	userKey := "user::" + username
	userCol := config.InventoryScope.Collection("users")
	getResult, err := userCol.Get(userKey, nil)

	if errors.Is(err, gocb.ErrDocumentNotFound) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]models.Booking{})
		return
	}

	var user models.User
	getResult.Content(&user)

	var bookings []models.Booking
	bookingsCol := config.InventoryScope.Collection("bookings")

	for _, ticketID := range user.BookingIDs {
		doc, err := bookingsCol.Get(ticketID, nil)
		if err == nil {
			var b models.Booking
			doc.Content(&b)
			bookings = append(bookings, b)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	if bookings == nil {
		bookings = []models.Booking{}
	}
	json.NewEncoder(w).Encode(bookings)
}
