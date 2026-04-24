# DriftConditions — Claude Code Project Instructions

## Production Database Access

Direct MySQL access from local machine (no SSH needed):

```bash
mysql -u mysql -p'1baddogE2Umy$qlr3m0t3' -h driftconditions.org driftconditions -e "SELECT ..."
```

- User: `mysql`
- Password: `DATABASE_REMOTE_PASSWORD` from `AdminServer/.env`
- Host: `driftconditions.org` (port 3306)
- Database: `driftconditions`
- Table names are lowercase (e.g. `audio`, `users`, `mixQueue`)

## Production Server Access

```bash
ssh debian@driftconditions.org
```

Key-based auth via `~/.ssh/id_rsa`. Repo at `/home/debian/driftconditions/`.

## Systemd Services (on server)

```bash
sudo systemctl restart mixengine
sudo systemctl restart adminserver
sudo journalctl -u mixengine -f --no-pager
```
