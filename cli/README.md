# Congruity CLI (prototype)

## Setup

```bash
cd cli
export SUPABASE_URL=https://nwprbforlqxzwpkiiyrc.supabase.co
export SUPABASE_ANON_KEY=your_anon_key
```

## Login

```bash
go run . login
```

Stores refresh token in OS keychain (or ~/.congruity/token fallback).

## List servers

```bash
go run . servers list
```

## Create server

```bash
go run . servers create --name "Test Server"
```

## List channels

```bash
go run . channels list --server <server_id>
```

## Create channel

```bash
go run . channels create --server <server_id> --name "general" --type text
```

## Read messages

```bash
go run . messages read --channel <channel_id>
```

## Send message

```bash
go run . messages send --channel <channel_id> --text "Hello"
```

## Friend request

```bash
go run . friends request <username>
```

## DM

```bash
go run . dms send <username> "Hello"
```
