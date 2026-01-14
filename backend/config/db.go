package config

import (
	"log"
	"os"
	"time"

	"github.com/couchbase/gocb/v2"
	"github.com/joho/godotenv"
)

var Cluster *gocb.Cluster
var InventoryScope *gocb.Scope

func ConnectDB() {

	err := godotenv.Load()
	if err != nil {
		panic("Error loading .env file")
	}

	dbHost := os.Getenv("DB_HOST")
	dbUser := os.Getenv("DB_USERNAME")
	dbPass := os.Getenv("DB_PASSWORD")

	if dbHost == "" || dbPass == "" {
		log.Fatal("DB_HOST or DB_PASSWORD is not set")
	}
	opts := gocb.ClusterOptions{
		Authenticator: gocb.PasswordAuthenticator{
			Username: dbUser,
			Password: dbPass,
		},
	}

	Cluster, err = gocb.Connect(dbHost, opts)
	if err != nil {
		log.Fatal("Could not connect to Couchabse!", err)
	}

	bucket := Cluster.Bucket("travel-sample")
	err = bucket.WaitUntilReady(10*time.Second, nil)

	if err != nil {
		log.Fatal("Bucket not ready", err)
	}

	InventoryScope = bucket.Scope("inventory")
	log.Println("Connection Success")

}
