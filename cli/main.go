package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/zalando/go-keyring"
)

type Session struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	User         struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	} `json:"user"`
}

type SupabaseClient struct {
	URL string
	Key string
}

const keyringService = "congruity"
const keyringUser = "supabase_refresh_token"
const tokenFileName = ".congruity/token"

func main() {
	if len(os.Args) < 2 {
		usage()
		return
	}

	cmd := os.Args[1]
	switch cmd {
	case "login":
		handleLogin()
	case "servers":
		handleServers(os.Args[2:])
	case "channels":
		handleChannels(os.Args[2:])
	case "messages":
		handleMessages(os.Args[2:])
	case "friends":
		handleFriends(os.Args[2:])
	case "dms":
		handleDMs(os.Args[2:])
	case "whoami":
		handleWhoAmI()
	default:
		usage()
	}
}

func usage() {
	fmt.Println("congruity-cli")
	fmt.Println("Commands:")
	fmt.Println("  login")
	fmt.Println("  servers list")
	fmt.Println("  channels list --server <id>")
	fmt.Println("  messages read --channel <id>")
	fmt.Println("  messages send --channel <id> --text <message>")
	fmt.Println("  whoami")
	fmt.Println("  friends list|request --username <name>")
	fmt.Println("  dms read|send --username <name> [--text <message>]")
}

func handleWhoAmI() {
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

	fmt.Printf("%s\t%s\n", session.User.ID, session.User.Email)
}

func readEnv() (SupabaseClient, error) {
	url := os.Getenv("SUPABASE_URL")	
	key := os.Getenv("SUPABASE_ANON_KEY")
	if url == "" || key == "" {
		return SupabaseClient{}, fmt.Errorf("missing SUPABASE_URL or SUPABASE_ANON_KEY env vars")
	}
	return SupabaseClient{URL: url, Key: key}, nil
}

func handleLogin() {
	client, err := readEnv()
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Email: ")
	email, _ := reader.ReadString('\n')
	fmt.Print("Password: ")
	password, _ := reader.ReadString('\n')
	email = strings.TrimSpace(email)
	password = strings.TrimSpace(password)

	payload := map[string]string{
		"email":    email,
		"password": password,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", client.URL+"/auth/v1/token?grant_type=password", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", client.Key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("Login failed:", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		fmt.Println("Login failed with status:", resp.Status)
		return
	}

	var session Session
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		fmt.Println("Decode error:", err)
		return
	}

	if err := keyring.Set(keyringService, keyringUser, session.RefreshToken); err != nil {
		// Fallback to local file storage
		if ferr := writeTokenFile(session.RefreshToken); ferr != nil {
			fmt.Println("Failed to store token:", err)
			return
		}
	}

	fmt.Println("Logged in as", session.User.Email)
}

func writeTokenFile(token string) error {
	path := userTokenPath()
	if path == "" {
		return fmt.Errorf("could not resolve home directory")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(token), 0600)
}

func readTokenFile() (string, error) {
	path := userTokenPath()
	if path == "" {
		return "", fmt.Errorf("could not resolve home directory")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(data)), nil
}

func userTokenPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, tokenFileName)
}

func fetchUser(client SupabaseClient, accessToken string) (struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}, error) {
	var user struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	}
	url := client.URL + "/auth/v1/user"
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("apikey", client.Key)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return user, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return user, fmt.Errorf("user fetch failed: %s", resp.Status)
	}

	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return user, err
	}

	return user, nil
}

func refreshSession(client SupabaseClient) (Session, error) {
	token, err := keyring.Get(keyringService, keyringUser)
	if err != nil {
		if tokenFile, ferr := readTokenFile(); ferr == nil {
			token = tokenFile
		} else {
			return Session{}, fmt.Errorf("not logged in; run congruity login")
		}
	}

	payload := map[string]string{"refresh_token": token}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", client.URL+"/auth/v1/token?grant_type=refresh_token", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", client.Key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return Session{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return Session{}, fmt.Errorf("refresh failed: %s", resp.Status)
	}

	var session Session
	if err := json.NewDecoder(resp.Body).Decode(&session); err != nil {
		return Session{}, err
	}

	if session.RefreshToken != "" {
		_ = keyring.Set(keyringService, keyringUser, session.RefreshToken)
	}

	if session.User.ID == "" {
		user, err := fetchUser(client, session.AccessToken)
		if err == nil {
			session.User = user
		}
	}

	return session, nil
}

func handleServers(args []string) {
	if len(args) < 1 {
		fmt.Println("Usage: servers list|memberships|create|invite")
		return
	}
	action := args[0]

	fs := flag.NewFlagSet("servers", flag.ExitOnError)
	name := fs.String("name", "", "server name")
	serverID := fs.String("id", "", "server id")
	hostingType := fs.String("hosting", "self_hosted", "hosting type")
	_ = fs.Parse(args[1:])
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
		url := client.URL + "/rest/v1/servers?select=id,name,description,created_at"
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

		var servers []map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&servers); err != nil {
			fmt.Println("Decode error:", err)
			return
		}

		for _, s := range servers {
			fmt.Printf("%v\t%v\n", s["id"], s["name"])
		}
	case "memberships":
		url := client.URL + "/rest/v1/server_members?select=server_id,role&user_id=eq." + session.User.ID
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

		var memberships []map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&memberships); err != nil {
			fmt.Println("Decode error:", err)
			return
		}

		for _, m := range memberships {
			fmt.Printf("%v\t%v\n", m["server_id"], m["role"])
		}
	case "create":
		if strings.TrimSpace(*name) == "" {
			fmt.Println("Usage: servers create --name <name> [--hosting self_hosted]")
			return
		}

		payload := map[string]string{
			"name":         *name,
			"owner_id":     session.User.ID,
			"hosting_type": *hostingType,
		}
		body, _ := json.Marshal(payload)
		url := client.URL + "/rest/v1/servers"
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

		var created []map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&created)
		if len(created) == 0 {
			fmt.Println("Server created")
			return
		}

		serverID := fmt.Sprintf("%v", created[0]["id"])
		fmt.Printf("Created server %s\n", serverID)

		memberPayload := map[string]string{
			"server_id": serverID,
			"user_id":   session.User.ID,
			"role":      "owner",
		}
		memberBody, _ := json.Marshal(memberPayload)
		memberReq, _ := http.NewRequest("POST", client.URL+"/rest/v1/server_members", bytes.NewReader(memberBody))
		memberReq.Header.Set("apikey", client.Key)
		memberReq.Header.Set("Authorization", "Bearer "+session.AccessToken)
		memberReq.Header.Set("Content-Type", "application/json")
		memberReq.Header.Set("Prefer", "return=representation")
		memberResp, err := http.DefaultClient.Do(memberReq)
		if err != nil {
			fmt.Println("Membership error:", err)
			return
		}
		defer memberResp.Body.Close()

		if memberResp.StatusCode >= 300 {
			mbody, _ := io.ReadAll(memberResp.Body)
			fmt.Println("Membership error:", memberResp.Status, string(mbody))
			return
		}
	case "invite":
		if strings.TrimSpace(*serverID) == "" {
			fmt.Println("Usage: servers invite --id <server_id>")
			return
		}

		url := client.URL + "/rest/v1/servers?select=invite_code&id=eq." + *serverID
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

		var data []map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&data)
		if len(data) == 0 {
			fmt.Println("No invite code found")
			return
		}
		fmt.Println(data[0]["invite_code"])
	default:
		fmt.Println("Usage: servers list|memberships|create|invite")
	}
}

func handleChannels(args []string) {
	if len(args) < 1 {
		fmt.Println("Usage: channels list|create --server <id>")
		return
	}
	action := args[0]

	fs := flag.NewFlagSet("channels", flag.ExitOnError)
	serverID := fs.String("server", "", "server id")
	name := fs.String("name", "", "channel name")
	typeArg := fs.String("type", "text", "channel type")
	_ = fs.Parse(args[1:])

	if *serverID == "" {
		fmt.Println("Usage: channels list|create --server <id>")
		return
	}

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
		url := client.URL + "/rest/v1/channels?select=id,name,type,position&server_id=eq." + *serverID
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

		var channels []map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&channels); err != nil {
			fmt.Println("Decode error:", err)
			return
		}

		for _, ch := range channels {
			fmt.Printf("%v\t%v\t%v\n", ch["id"], ch["type"], ch["name"])
		}
	case "create":
		if strings.TrimSpace(*name) == "" {
			fmt.Println("Usage: channels create --server <id> --name <name> [--type text]")
			return
		}

		payload := map[string]string{
			"server_id": *serverID,
			"name":      *name,
			"type":      *typeArg,
		}
		body, _ := json.Marshal(payload)
		url := client.URL + "/rest/v1/channels"
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

		var created []map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&created)
		if len(created) > 0 {
			fmt.Printf("Created channel %v (%v)\n", created[0]["id"], created[0]["name"])
			return
		}
		fmt.Println("Channel created")
	default:
		fmt.Println("Usage: channels list|create --server <id>")
	}
}

func handleMessages(args []string) {
	if len(args) < 1 {
		fmt.Println("Usage: messages read|send --channel <id>")
		return
	}

	command := args[0]
	fs := flag.NewFlagSet("messages", flag.ExitOnError)
	channelID := fs.String("channel", "", "channel id")
	text := fs.String("text", "", "message text")
	_ = fs.Parse(args[1:])
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

	switch command {
	case "read":
		if *channelID == "" {
			fmt.Println("Usage: messages read --channel <id>")
			return
		}
		url := client.URL + "/rest/v1/messages?select=id,content,created_at,user_id&channel_id=eq." + *channelID + "&order=created_at.asc&limit=50"
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
			fmt.Println("Error:", resp.Status)
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
		if *channelID == "" || strings.TrimSpace(*text) == "" {
			fmt.Println("Usage: messages send --channel <id> --text <message>")
			return
		}

		payload := map[string]string{
			"channel_id": *channelID,
			"content":    *text,
			"user_id":    session.User.ID,
		}
		body, _ := json.Marshal(payload)
		url := client.URL + "/rest/v1/messages"
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
			fmt.Println("Error:", resp.Status)
			return
		}

		fmt.Println("Message sent")
	default:
		fmt.Println("Usage: messages read|send --channel <id>")
	}
}
