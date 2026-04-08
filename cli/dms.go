package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

func handleDMs(args []string) {
	if len(args) < 1 {
		fmt.Println("Usage: dms read|send --username <name> [--text <message>]")
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

	if len(args) < 2 {
		fmt.Println("Usage: dms read|send <username> [text]")
		return
	}
	username := strings.TrimSpace(args[1])
	if username == "" {
		fmt.Println("Usage: dms read|send --username <name> [--text <message>]")
		return
	}

	friend, err := lookupProfileByUsername(client, session.AccessToken, username)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	channelID, err := ensureDmChannel(client, session.AccessToken, session.User.ID, friend.ID)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	switch action {
	case "read":
		url := client.URL + "/rest/v1/dm_messages?select=id,content,created_at,user_id&channel_id=eq." + channelID + "&order=created_at.asc&limit=50"
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

		var messages []map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&messages); err != nil {
			fmt.Println("Decode error:", err)
			return
		}
		for _, msg := range messages {
			fmt.Printf("%v\t%v\n", msg["user_id"], msg["content"])
		}
	case "send":
		if len(args) < 3 {
			fmt.Println("Usage: dms send <username> <message>")
			return
		}
		text := strings.TrimSpace(args[2])
		if text == "" {
			fmt.Println("Usage: dms send <username> <message>")
			return
		}

		payload := map[string]string{
			"channel_id": channelID,
			"user_id":    session.User.ID,
			"content":    text,
		}
		body, _ := json.Marshal(payload)
		url := client.URL + "/rest/v1/dm_messages"
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

		fmt.Println("DM sent")
	default:
		fmt.Println("Usage: dms read|send --username <name> [--text <message>]")
	}
}

func ensureDmChannel(client SupabaseClient, accessToken, userID, friendID string) (string, error) {
	// find channels for current user
	url := client.URL + "/rest/v1/dm_members?select=channel_id&user_id=eq." + userID
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("apikey", client.Key)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("dm membership fetch failed: %s %s", resp.Status, string(body))
	}

	var memberships []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&memberships); err != nil {
		return "", err
	}

	if len(memberships) > 0 {
		// check intersection
		ids := make([]string, 0, len(memberships))
		for _, m := range memberships {
			if v, ok := m["channel_id"]; ok {
				ids = append(ids, fmt.Sprintf("%v", v))
			}
		}
		if len(ids) > 0 {
			url = client.URL + "/rest/v1/dm_members?select=channel_id&user_id=eq." + friendID + "&channel_id=in.(" + strings.Join(ids, ",") + ")"
			req, _ = http.NewRequest("GET", url, nil)
			req.Header.Set("apikey", client.Key)
			req.Header.Set("Authorization", "Bearer "+accessToken)

			resp2, err := http.DefaultClient.Do(req)
			if err == nil {
				defer resp2.Body.Close()
				if resp2.StatusCode < 300 {
					var shared []map[string]interface{}
					_ = json.NewDecoder(resp2.Body).Decode(&shared)
					if len(shared) > 0 {
						return fmt.Sprintf("%v", shared[0]["channel_id"]), nil
					}
				}
			}
		}
	}

	// create channel via RPC
	payload := map[string]string{"friend_id": friendID}
	body, _ := json.Marshal(payload)
	createReq, _ := http.NewRequest("POST", client.URL+"/rest/v1/rpc/create_dm_channel", bytes.NewReader(body))
	createReq.Header.Set("apikey", client.Key)
	createReq.Header.Set("Authorization", "Bearer "+accessToken)
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Prefer", "return=representation")

	createResp, err := http.DefaultClient.Do(createReq)
	if err != nil {
		return "", err
	}
	defer createResp.Body.Close()

	if createResp.StatusCode >= 300 {
		body, _ := io.ReadAll(createResp.Body)
		return "", fmt.Errorf("dm channel create failed: %s %s", createResp.Status, string(body))
	}

	respBytes, _ := io.ReadAll(createResp.Body)
	// Try array response
	var created []map[string]interface{}
	if err := json.Unmarshal(respBytes, &created); err == nil {
		if len(created) > 0 {
			if val, ok := created[0]["create_dm_channel"]; ok {
				return fmt.Sprintf("%v", val), nil
			}
		}
	}

	// Try scalar string response
	var scalar string
	if err := json.Unmarshal(respBytes, &scalar); err == nil && scalar != "" {
		return scalar, nil
	}

	return "", fmt.Errorf("dm channel create failed: %s", string(respBytes))
}
