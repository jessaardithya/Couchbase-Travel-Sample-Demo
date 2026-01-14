package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"super-app-demo/backend/config"
	"super-app-demo/backend/models"
	"time"

	"github.com/couchbase/gocb/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var SecretKey = []byte("secret-key-2026")

func Register(w http.ResponseWriter, r *http.Request) {
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid Input", 400)
		return
	}

	hashedPwd, _ := bcrypt.GenerateFromPassword([]byte(user.Password), 14)
	user.Password = string(hashedPwd)

	user.Type = "user"
	if user.BookingIDs == nil {
		user.BookingIDs = []string{}
	}

	userKey := "user::" + user.Username
	collection := config.InventoryScope.Collection("users")

	_, err := collection.Insert(userKey, user, nil)
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentExists) {
			http.Error(w, "Username already taken", 409)
		} else {
			http.Error(w, "Server error", 500)
		}
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully!"})
}

func Login(w http.ResponseWriter, r *http.Request) {
	var input models.User
	json.NewDecoder(r.Body).Decode(&input)

	userKey := "user::" + input.Username
	result, err := config.InventoryScope.Collection("users").Get(userKey, nil)
	if err != nil {
		http.Error(w, "User not found", 401)
		return
	}

	var dbUser models.User
	result.Content(&dbUser)

	err = bcrypt.CompareHashAndPassword([]byte(dbUser.Password), []byte(input.Password))
	if err != nil {
		http.Error(w, "Invalid password", 401)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": dbUser.Username,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, _ := token.SignedString(SecretKey)

	json.NewEncoder(w).Encode(map[string]string{
		"token":    tokenString,
		"username": dbUser.Username,
	})

}
