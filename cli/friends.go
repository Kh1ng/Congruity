package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

func handleFriends(args []string) {
	if len(args) < 1 {
		fmt.Println("Usage: friends list|request --username <name>")
		return
	}
	action := args[0]

	client, err := readEnv()
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	session, err := refreshSession(client)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	switch action {
	case "list":
		url := client.URL + "/rest/v1/friendships?select=id,status,friend:profiles!friendships_friend_id_fkey(id,username,display_name),user:profiles!friendships_user_id_fkey(id,username,display_name)"
		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Set("apikey", client.Key)
		req.Header.Set("Authorization", "Bearer "+session.AccessToken)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 300 {
			body, _ := io.ReadAll(resp.Body)
			fmt.Println("Error:", resp.Status, string(body))
			return
		}

		var friendships []map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&friendships); err != nil {
			fmt.Println("Decode error:", err)
			return
		}

		for _, f := range friendships {
			fmt.Printf("%v\t%v\n", f["id"], f["status"])
		}
	case "request":
		if len(args) < 2 {
			fmt.Println("Usage: friends request <username>")
			return
		}
		username := strings.TrimSpace(args[1])
		if username == "" {
			fmt.Println("Usage: friends request --username <name>")
			return
		}

		profile, err := lookupProfileByUsername(client, session.AccessToken, username)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}

		payload := map[string]string{
			"user_id":   session.User.ID,
			"friend_id": profile.ID,
			"status":    "pending",
		}
		body, _ := json.Marshal(payload)
		url := client.URL + "/rest/v1/friendships"
		req, _ := http.NewRequest("POST", url, bytes.NewReader(body))
		req.Header.Set("apikey", client.Key)
		req.Header.Set("Authorization", "Bearer "+session.AccessToken)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Prefer", "return=representation")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 300 {
			body, _ := io.ReadAll(resp.Body)
			fmt.Println("Error:", resp.Status, string(body))
			return
		}

		fmt.Println("Friend request sent")
	default:
		fmt.Println("Usage: friends list|request --username <name>")
	}
}

type Profile struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
}

func lookupProfileByUsername(client SupabaseClient, accessToken, username string) (Profile, error) {
	url := client.URL + "/rest/v1/profiles?select=id,username,display_name&username=eq." + username
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("apikey", client.Key)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return Profile{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return Profile{}, fmt.Errorf("lookup failed: %s %s", resp.Status, string(body))
	}

	var profiles []Profile
	if err := json.NewDecoder(resp.Body).Decode(&profiles); err != nil {
		return Profile{}, err
	}
	if len(profiles) == 0 {
		return Profile{}, fmt.Errorf("user not found")
	}

	return profiles[0], nil
}
