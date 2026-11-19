# 비자앤잡 배포 절차 (A-8, DECISIONS Q-30·Q-31)

이 문서는 **처음 서버를 만드는 사람이 위에서부터 그대로 따라 하도록** 쓴 절차서다. 각 단계는 "명령(복사해서 붙여 넣기) → 성공하면 보이는 것 → 막히면 확인할 것" 순서로 되어 있다.

**구성 (스테이징)**: AWS Lightsail 서울 서버 1대(메모리 2GB, Ubuntu 24.04) 안에서 Docker로 아래를 모두 돌린다.

```
인터넷 ──80/443──▶ caddy(자동 HTTPS·기본 인증) ──(내부망)──▶ app:3000 ──▶ db (PostgreSQL 17, 컨테이너)
                                                            worker   ──▶ db
                                                            migrate  ──▶ db (시작 때 1회)
                                                            backup   ──▶ db + 비공개 파일 → /home/ubuntu/visanjob-backups (매일)
```

- DB는 같은 서버의 `db` 컨테이너다(compose 프로필 `local-db`). 호스트 포트를 열지 않으므로 인터넷에서 DB에 접속할 수 없다. 내부망이라 SSL·인증서가 필요 없다.
- **운영 전환 때는 관리형 DB(외부, `sslmode=require` + CA 인증서)로 바꾼다** → 마지막 절 "운영 전환".
- 먼저 **비공개 스테이징**(`staging.visanjob.co.kr`: 접속 비밀번호, 검색 차단)을 열고, 법무 확인이 끝난 뒤 운영(`visanjob.co.kr`)으로 전환한다.

| 파일                             | 역할                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `Dockerfile`                     | 운영 이미지 1개(`app`·`worker`·`migrate`·`seed` 명령). 테스트 도구 없음                  |
| `deploy/docker-compose.yml`      | 서비스 구성(db·migrate·app·worker·caddy·backup), 재시작 정책, 헬스체크, 볼륨             |
| `deploy/Caddyfile`               | 스테이징 블록(기본 인증·noindex·robots 차단), 운영 블록(주석)                            |
| `deploy/.env.production.example` | 서버 환경 변수 목록(값 없음) → 서버에서 `deploy/.env`로 복사해 채움                      |
| `deploy/docker-entrypoint.sh`    | 명령별 필수 환경 변수·DB 주소 확인. 빠지거나 잘못되면 컨테이너가 시작하지 않음           |
| `deploy/backup.sh`               | 매일 DB 덤프(`pg_dump -Fc`)와 비공개 파일 묶음(tar) 생성, 최근 14개만 보관               |
| `scripts/gen-secrets.ts`         | 비밀값·DB 비밀번호 생성과 `DATABASE_URL` 조립 → 파일에만 기록, 화면에는 변수 이름만 출력 |

> **비용**: 이 문서는 AWS 공식 요금표에 적힌 정가만 적는다. 실제 청구액은 사용량·세금·환율에 따라 달라지므로 예산 알림(가-2)으로 확인한다.
>
> **표기**: `ubuntu@...:~$` 다음에 붙여 넣는 명령은 모두 서버(브라우저 SSH 창)에서 실행한다. 명령 안의 `<...>`는 자기 값으로 바꾼다. AWS 화면 이름은 바뀔 수 있으니 비슷한 이름을 찾는다.

---

## (가) AWS 계정 준비

### 가-1. 고급 기능(유료 플랜) 켜기

1. AWS 콘솔(<https://console.aws.amazon.com>)에 루트 계정으로 로그인한다. 루트 계정에는 MFA(2단계 인증)를 켜 둔다(오른쪽 위 계정 이름 → 보안 자격 증명 → MFA 할당).
2. 새 계정이 **무료 플랜**이면 일부 서비스가 막혀 있다. 콘솔 위쪽 안내 띠 또는 "결제 및 비용 관리(Billing and Cost Management)" 화면의 **플랜 업그레이드(고급 기능 사용)** 버튼으로 유료 플랜으로 바꾼다.
   - 성공: 안내 띠가 사라지고 Lightsail 화면이 제한 없이 열린다.
   - 막히면: 결제 수단(카드)이 등록되어 있는지 "결제 및 비용 관리 → 결제 기본 설정"에서 확인한다.
3. 유료 플랜부터는 사용량이 청구될 수 있으므로 **바로 다음 단계(예산 알림)를 만든다.**

### 가-2. 예산 알림

1. 콘솔 검색창에 `Budgets` → **예산 생성(Create budget)**.
2. **템플릿 사용(Use a template)** → **월별 비용 예산(Monthly cost budget)**.
3. 예산 금액: 직접 정한다(예: 월 12 USD 서버만 쓴다면 그보다 조금 높은 금액). 알림 받을 이메일을 넣고 생성.
   - 성공: 예산 목록에 새 예산이 보이고, 금액의 85%·100%(실제)·100%(예측)에 이메일 알림이 간다.
   - 막히면: 예산 화면이 권한 오류면 루트 계정으로 로그인했는지 확인한다.

## (나) Lightsail 서버 만들기

### 나-1. 인스턴스 생성 (서울, Ubuntu 24.04, 2GB)

1. <https://lightsail.aws.amazon.com> → **인스턴스 생성(Create instance)**.
2. 위치: **서울(ap-northeast-2)**, 가용 영역은 기본값(예: `ap-northeast-2a`).
3. 플랫폼 **Linux/Unix** → 블루프린트 **운영 체제(OS) 전용** → **Ubuntu 24.04 LTS**.
4. 요금제(번들): **월 12 USD, 메모리 2GB** 번들(IPv4 포함 요금제). 화면에 표시된 vCPU·디스크·전송량을 확인한다.
   - 무료 혜택: **공식 요금표 기준, 일부 번들은 3개월 무료 혜택이 있으며 계정당 번들 1개에 적용된다.** 자기 계정에 적용되는지는 생성 화면과 공식 요금표에서 직접 확인한다.
5. 인스턴스 이름: `visanjob-staging` → **생성**.
   - 성공: 몇 분 뒤 상태가 **실행 중(Running)**.
   - 막히면: 서울 리전에 해당 번들이 안 보이면 위치가 서울인지 다시 확인한다.

### 나-2. 고정 IP 붙이기

1. Lightsail 홈 → **네트워킹(Networking)** → **고정 IP 생성(Create static IP)** → 위치 서울, 연결할 인스턴스 `visanjob-staging` → 이름 `visanjob-staging-ip` → 생성.
2. 표시된 주소(예: `3.xx.xx.xx`)를 적어 둔다. 아래에서 `<고정IP>`로 쓴다.
   - 성공: 인스턴스 카드에 고정 IP가 보인다.
   - 주의: 인스턴스에 **연결하지 않은** 고정 IP는 과금될 수 있다(공식 요금표 확인). 인스턴스를 지우면 고정 IP도 함께 해제한다.

### 나-3. 방화벽

인스턴스 → **네트워킹** 탭 → **IPv4 방화벽**에 아래 규칙만 둔다(IPv6 방화벽도 같게, 또는 IPv6를 끈다).

| 애플리케이션 | 프로토콜 | 포트 | 허용 대상                                                                                           |
| ------------ | -------- | ---- | --------------------------------------------------------------------------------------------------- |
| SSH          | TCP      | 22   | **관리자 IP만 권장**: "IP 주소로 제한" + **"Lightsail 브라우저 SSH 허용" 체크**(체크해야 나-4가 됨) |
| HTTP         | TCP      | 80   | 모든 IP (인증서 발급, HTTPS로 이동)                                                                 |
| HTTPS        | TCP      | 443  | 모든 IP                                                                                             |

- DB(5432)·앱(3000) 포트는 **열지 않는다**. compose가 호스트에 공개하지 않으므로 열어도 쓰이지 않지만, 규칙도 만들지 않는다.
- 관리자 IP는 집·사무실 인터넷 주소다. 바뀌면 규칙을 고친다. 모르겠으면 우선 "Lightsail 브라우저 SSH 허용"만 켜 두고 브라우저 SSH만 쓴다.

### 나-4. DNS A 레코드 (staging)

도메인을 산 곳(도메인 관리 화면)에서 레코드를 추가한다.

| 종류 | 호스트(이름) | 값         | TTL              |
| ---- | ------------ | ---------- | ---------------- |
| A    | `staging`    | `<고정IP>` | 300(또는 기본값) |

- 확인은 다-1 이후 서버에서: `getent hosts staging.visanjob.co.kr`
  - 성공: `<고정IP>  staging.visanjob.co.kr`
  - 막히면: 몇 분~몇 시간 기다린다. 호스트 칸에 `staging.visanjob.co.kr` 전체를 넣어야 하는 업체도 있다.
- Caddy는 처음 시작할 때 이 이름으로 HTTPS 인증서를 받으므로, **DNS가 맞은 뒤에** 라-4(실행)를 한다.

## (다) 서버 접속과 기본 설치

### 다-1. 브라우저 SSH 접속

Lightsail 홈 → 인스턴스 카드의 **터미널 아이콘(>\_ 연결)**. 검은 창에 `ubuntu@ip-...:~$`가 보이면 접속된 것이다. 이후 명령은 이 창에 붙여 넣는다(붙여 넣기: 창 오른쪽 아래 클립보드 아이콘 또는 Ctrl+Shift+V).

보안 업데이트 자동 적용:

```bash
sudo apt-get update && sudo apt-get install -y unattended-upgrades
```

- 성공: 마지막에 오류 없이 `$` 프롬프트로 돌아온다(이미 설치돼 있으면 "already the newest version").

### 다-2. 스왑 2GB (빌드 중 메모리 부족 대비)

메모리 2GB 서버에서 이미지 빌드(`next build`)는 메모리가 모자랄 수 있다. 빌드 전에 **반드시** 스왑을 만든다. 한 줄씩 붙여 넣는다.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

- 성공: `free -h`의 `Swap:` 줄 합계가 `2.0Gi`.
- 막히면: `fallocate: ... Text file busy`/`already exists`면 이미 만든 것이다 → `free -h`만 확인. `/etc/fstab`에 같은 줄이 두 번 들어가지 않게 한다(`grep swapfile /etc/fstab`로 1줄인지 확인).

### 다-3. Docker 설치

Docker 공식 문서("Install Docker Engine on Ubuntu")의 apt 저장소 방식이다. 공식 문서 내용이 바뀌었으면 공식 문서를 따른다. 한 줄씩 붙여 넣는다.

```bash
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
```

이제 **브라우저 SSH 창을 닫고 다시 연결**한다(그래야 `sudo` 없이 `docker`를 쓸 수 있다). 다시 접속한 뒤:

```bash
docker version && docker compose version
```

- 성공: `Server: Docker Engine` 정보와 `Docker Compose version v2.xx` 출력. **Compose는 2.20 이상**이어야 한다(`depends_on`의 `required: false` 사용).
- 막히면: `permission denied ... docker.sock`이면 창을 닫고 다시 연결하지 않은 것이다.

### 다-4. 배포 키(deploy key)와 저장소 가져오기

저장소(`github.com/dokant/VISA-n-JOB`)는 비공개로 두고, 서버에는 **읽기 전용 배포 키**만 준다.

1. 서버에서 키를 만들고 공개키를 출력한다:

   ```bash
   ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 -C visanjob-staging
   cat ~/.ssh/id_ed25519.pub
   ```

   - 성공: `ssh-ed25519 AAAA... visanjob-staging` 한 줄. 이 줄을 복사한다(공개키라 보여도 된다. 개인키 `~/.ssh/id_ed25519`는 절대 복사·전송하지 않는다).

2. GitHub 저장소 → **Settings → Deploy keys → Add deploy key** → 제목 `visanjob-staging`, 키 붙여 넣기, **Allow write access는 끈 채로** → Add key.
3. 연결 확인:

   ```bash
   ssh -o StrictHostKeyChecking=accept-new -T git@github.com
   ```

   - 성공: `Hi dokant/VISA-n-JOB! You've successfully authenticated, but GitHub does not provide shell access.`
   - 처음 연결 때 표시되는 GitHub 서버 지문은 GitHub 문서("GitHub's SSH key fingerprints")의 값과 같은지 확인한다.
   - 막히면: `Permission denied (publickey)`면 2번에서 붙여 넣은 키가 1번 출력과 같은지 확인한다.

4. 가져오기:

   ```bash
   git clone git@github.com:dokant/VISA-n-JOB.git ~/visanjob
   cd ~/visanjob && git log --oneline -1
   ```

   - 성공: 최근 커밋 한 줄이 보인다.

## (라) 설정, 빌드, 실행

### 라-1. `deploy/.env` 만들기

1. 예시를 복사하고 권한을 막는다:

   ```bash
   cd ~/visanjob && cp deploy/.env.production.example deploy/.env && chmod 600 deploy/.env
   ```

2. 비밀값을 만든다(서버에 Node가 없으므로 공식 node 이미지로 실행. 값은 파일에만 쓰이고 화면에는 **이름만** 나온다):

   ```bash
   docker run --rm --user "$(id -u):$(id -g)" -v "$PWD":/w -w /w node:24-bookworm-slim node scripts/gen-secrets.ts deploy/.env
   ```

   - 성공: `generated: AUTH_SECRET, ENCRYPTION_KEYS, HASH_KEY, INGEST_API_KEY, SEED_ADMIN_PASSWORD, POSTGRES_PASSWORD, DATABASE_URL`
   - 채워지는 것: 앱 비밀값(Q-08 형식), **DB 비밀번호(`POSTGRES_PASSWORD`)**, 그리고 내부 DB 접속 주소 `DATABASE_URL=postgresql://visanjob:<DB 비밀번호>@db:5432/visanjob`. **URL을 손으로 만들 필요가 없다.**
   - 다시 실행해도 이미 있는 값은 바꾸지 않는다(`kept (already set): ...`). `warning: DATABASE_URL password differs from POSTGRES_PASSWORD`가 나오면 두 줄 중 하나를 손으로 고친 것이다 → 아래 "막혔을 때"의 DB 비밀번호 항목.

3. 사람이 채울 값은 **세 개뿐**이다. `<관리자 이메일>`만 바꿔서 붙여 넣는다:

   ```bash
   sed -i 's|^SITE_URL=$|SITE_URL=https://staging.visanjob.co.kr|; s|^AUTH_URL=$|AUTH_URL=https://staging.visanjob.co.kr|' deploy/.env
   sed -i 's|^SEED_ADMIN_EMAIL=$|SEED_ADMIN_EMAIL=<관리자 이메일>|' deploy/.env
   grep -E '^(COMPOSE_PROFILES|SITE_URL|AUTH_URL|SEED_ADMIN_EMAIL|TRUST_PROXY|FEATURE_[A-Z_]+)=' deploy/.env
   ```

   - 성공(마지막 명령 출력): `COMPOSE_PROFILES=local-db`, `SITE_URL=https://staging.visanjob.co.kr`, `AUTH_URL=https://staging.visanjob.co.kr`, `SEED_ADMIN_EMAIL=<입력한 이메일>`, `TRUST_PROXY=true`, `FEATURE_...=false` 4줄.
   - 그대로 두는 것: `FEATURE_*` 4종은 **모두 false**(법무 확인 전, A-5), `SMTP_*`는 **모두 비워 둔다**(실제 메일 발송은 A-3 별도 승인).
   - 이 출력에는 비밀값이 없다. `cat deploy/.env`처럼 파일 전체를 화면에 띄우지 않는다(화면 공유·녹화 주의).

4. **`deploy/.env` 사본을 서버 밖 안전한 곳(비밀번호 관리자 등)에 보관한다.** `ENCRYPTION_KEYS`·`HASH_KEY`를 잃으면 DB의 암호화 필드를 영영 읽을 수 없다. 사본은 백업 파일(마-1)과 **다른 곳**에 둔다.

### 라-2. 스테이징 접속 비밀번호 해시

스테이징 사이트 전체에 걸리는 접속 아이디·비밀번호를 정한다. 서버에는 **해시만** 저장한다(평문 저장 안 함).

```bash
read -rsp '스테이징 접속 비밀번호: ' P; echo; H=$(docker run --rm -e P caddy:2.10-alpine sh -c 'caddy hash-password --plaintext "$P"'); unset P; sed -i "s|^STAGING_BASIC_AUTH_HASH=.*|STAGING_BASIC_AUTH_HASH='$H'|" deploy/.env; unset H
sed -i 's|^STAGING_BASIC_AUTH_USER=.*|STAGING_BASIC_AUTH_USER=<접속 아이디>|' deploy/.env
grep -c "^STAGING_BASIC_AUTH_HASH='\$2a\$" deploy/.env
```

- 첫 줄: 비밀번호를 입력해도 화면에 안 보이는 것이 정상이다. 입력 후 Enter.
- 성공: 마지막 명령이 `1`을 출력.
- 막히면: `0`이면 첫 줄을 다시 실행한다. 해시에는 `$`가 있으므로 `.env`에서 **작은따옴표**로 감싸져 있어야 한다(위 명령이 그렇게 쓴다).
- 비밀번호 자체는 비밀번호 관리자에 보관한다. 서버에서는 다시 볼 수 없다.

### 라-3. 빌드

```bash
cd ~/visanjob/deploy && docker compose build
```

- 시간이 걸린다(수 분~십수 분). 빌드 중 인터넷이 필요하다(npm 패키지, Prisma 엔진, Google Fonts).
- 성공: 마지막에 오류 없이 `visanjob-app ... Built`.
- 막히면:
  - 빌드가 `Killed`·`exit code: 137`로 끝나면 메모리 부족 → 다-2 스왑이 켜져 있는지 `free -h`로 확인하고 다시 실행.
  - `SITE_URL is required`면 라-1의 3번을 다시 확인.
  - `STAGING_BASIC_AUTH_HASH is required`면 라-2를 다시 실행.

### 라-4. 실행

```bash
docker compose up -d
docker compose ps
```

- 순서: `db`(정상 대기) → `migrate`(1회, DB 표 만들기) → `app`·`worker` → `caddy`. `backup`은 db가 준비되면 시작.
- 성공(`docker compose ps`, 1~2분 뒤): `db` **healthy**, `app` **healthy**, `worker`·`caddy`·`backup` **running**. `migrate`는 끝난 서비스라 기본 목록에 없을 수 있다 → `docker compose ps -a`에서 `Exited (0)`.
- 막히면:
  - `docker compose logs migrate` — 마지막에 `All migrations have been successfully applied` 또는 `No pending migrations`가 있어야 한다.
  - `docker compose logs db` — `database system is ready to accept connections`가 있어야 한다. `superuser password is not specified`면 `POSTGRES_PASSWORD`가 비어 있다 → 라-1의 2번 다시 실행 후 `docker compose up -d`.
  - 앱·워커 로그에 `{"level":"error","event":"config.missing","name":"..."}`가 있으면 그 이름의 값이 비어 있다(값은 출력하지 않는다). `config.embedded_database`면 `DATABASE_URL`이 개발용 포트(54320·54329)를 가리킨다. `config.internal_database_tls`면 내부 `db`인데 주소에 `sslmode=require`가 붙어 있다 → 지운다.
  - `caddy` 로그에 인증서 오류가 반복되면 나-4 DNS와 나-3 방화벽 80·443을 확인한다.

### 라-5. 관리자 계정 시드와 2단계 인증

```bash
docker compose run --rm seed
```

- 성공: 출력에 `"admin":"created"`(이미 있으면 `exists`). 참조 데이터(시·도, 업종, 비자 유형, SAMPLE 규칙 DRAFT)도 함께 들어간다. 가짜 구직자는 만들지 않는다(`SEED_SAMPLE_SEEKERS=false`, 운영 모드에서 거부).
- 초기 관리자 비밀번호는 `deploy/.env`의 `SEED_ADMIN_PASSWORD`다. 화면 공유가 없는 상태에서 이 한 줄만 본다: `grep '^SEED_ADMIN_PASSWORD=' ~/visanjob/deploy/.env`
- 브라우저: `https://staging.visanjob.co.kr/admin/login` (스테이징 접속 아이디·비밀번호를 먼저 묻는다) → 관리자 로그인 → **TOTP 2단계 인증 등록** → 로그아웃 → 다시 로그인해 2FA 확인.
- 확인 후 초기 비밀번호 줄을 지운다(계정은 그대로 남고, 다음 시드 때 다시 만들지 않는다):

  ```bash
  sed -i '/^SEED_ADMIN_PASSWORD=/d' ~/visanjob/deploy/.env
  ```

- 시드의 규칙·점수표는 SAMPLE 초안(BR-12), 시·군·구는 검토 필요 표시(PC-6)다. 실제 값은 행정사가 관리자 화면에서 입력한다(A-6).

### 라-6. 동작 확인표

`~/visanjob/deploy`에서 실행한다. `USER`는 스테이징 접속 아이디. `-u USER`만 주면 curl이 비밀번호를 묻는다.

| #   | 확인                  | 명령 / 방법                                                                                                       | 기대 결과                                                                                                                                  |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 컨테이너 상태         | `docker compose ps -a`                                                                                            | db·app `healthy`, worker·caddy·backup `running`, migrate `Exited (0)`                                                                      |
| 2   | DB 포트 비공개        | `docker compose port db 5432; sudo ss -ltnp \| grep -c ':5432'`                                                   | 첫 명령 출력 없음(또는 오류), 둘째 `0`                                                                                                     |
| 3   | 헬스체크(내부)        | `docker compose exec app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"` | `{"status":"ok"}`                                                                                                                          |
| 4   | 헬스체크(외부)        | `curl -s -u USER https://staging.visanjob.co.kr/api/health`                                                       | `{"status":"ok"}`                                                                                                                          |
| 5   | HTTPS 리디렉트·인증서 | `curl -sI http://staging.visanjob.co.kr/ko`                                                                       | 308 → `https://`. 브라우저 자물쇠 정상                                                                                                     |
| 6   | 기본 인증             | `curl -sI https://staging.visanjob.co.kr/ko`                                                                      | `401`                                                                                                                                      |
| 7   | 검색 차단 헤더        | `curl -sI https://staging.visanjob.co.kr/ko` 와 `curl -sI -u USER https://staging.visanjob.co.kr/ko`              | 두 응답 모두 `x-robots-tag: noindex, nofollow` (두 번째는 200)                                                                             |
| 8   | robots.txt            | `curl -s https://staging.visanjob.co.kr/robots.txt`                                                               | `User-agent: *` / `Disallow: /` (인증 없이)                                                                                                |
| 9   | 관리자 리디렉트(O-9)  | `curl -sI -u USER https://staging.visanjob.co.kr/admin`                                                           | `location: https://staging.visanjob.co.kr/admin/login` (localhost 아님)                                                                    |
| 10  | 언어 리디렉트         | `curl -sI -u USER https://staging.visanjob.co.kr/`                                                                | `location`이 `/ko` 또는 `https://staging.visanjob.co.kr/ko`                                                                                |
| 11  | 로그인·2FA            | 브라우저: `/admin/login` → 비밀번호 → TOTP → `/admin`                                                             | 관리자 화면 진입, 로그아웃 후 `/admin`은 로그인 화면으로                                                                                   |
| 12  | 워커 시작             | `docker compose logs worker`                                                                                      | `worker.started`, `notification.provider`(console). `config.database_ca_missing` 경고 **없음**(내부 DB)                                    |
| 13  | 워커 경고(정상)       | 같은 로그                                                                                                         | `status_check.transition_disabled` / `NO_REAL_CHANNEL` 경고 — 실제 채널 없음 → 상태 확인 전이 비활성(Q-27). **SMTP 승인(A-3) 전에는 정상** |
| 14  | 기능 플래그 꺼짐      | 브라우저 `/ko/jobs`, `curl -s -o /dev/null -w '%{http_code}' -u USER https://staging.visanjob.co.kr/api/jobs`     | 준비 중 화면, API `404`                                                                                                                    |
| 15  | 비공개 파일 볼륨      | `docker compose exec app sh -c 'ls -ld /data/private'`                                                            | `node` 소유, 권한 `drwx------`                                                                                                             |
| 16  | 오류 로그             | `docker compose logs app worker --since 10m \| grep '"level":"error"'`                                            | 없음                                                                                                                                       |
| 17  | 백업 생성             | `sudo ls -l /home/ubuntu/visanjob-backups/db /home/ubuntu/visanjob-backups/files`                                 | 오늘 날짜 `db-YYYY-MM-DD_HHMM.dump`, `private-files-...tar.gz`, 권한 `-rw-------` (마-1)                                                   |

## (마) 백업

### 마-1. 자동 백업 확인

`backup` 서비스(`deploy/backup.sh`)가 **매일 1번**(시작 직후 1번, 이후 매시간 확인해 그날 것이 없으면 생성) 아래를 만든다. 날짜·시각은 서울 시간이다.

| 위치(서버)                                                     | 내용                                     |
| -------------------------------------------------------------- | ---------------------------------------- |
| `/home/ubuntu/visanjob-backups/db/db-YYYY-MM-DD_HHMM.dump`     | DB 전체(`pg_dump -Fc`, 압축 사용자 형식) |
| `/home/ubuntu/visanjob-backups/files/private-files-....tar.gz` | 비공개 업로드 파일(소개 확인서, R-210)   |

- **최근 14개씩만 보관**하고 오래된 것은 자동으로 지운다(`deploy/.env`의 `BACKUP_KEEP`으로 변경). 폴더는 `BACKUP_DIR`로 바꿀 수 있다.
- **개인정보가 들어 있다.** 폴더는 `0700`, 파일은 `0600`, 소유자 root라서 `sudo` 없이는 읽을 수 없다. 서버 밖으로 옮길 때는 암호화된 저장소에만 두고, `deploy/.env` 사본(암호화 키)과 **같은 곳에 두지 않는다**.

확인:

```bash
sudo ls -l /home/ubuntu/visanjob-backups/db /home/ubuntu/visanjob-backups/files
docker compose logs --tail 20 backup
```

- 성공: 두 폴더에 파일이 있고 로그에 `backup.db_done`, `backup.files_done`.
- 지금 바로 한 벌 더 만들기(업데이트 전 등): `docker compose run --rm backup once` → `backup.db_done`, `backup.files_done`.
- 막히면: `backup.database_url_missing`이면 `deploy/.env`의 `DATABASE_URL`이 비어 있다. `backup.db_failed`면 `docker compose ps db`가 healthy인지 확인.

### 마-2. 복원 (사고 때만)

복원은 현재 DB를 **통째로 바꾼다.** 먼저 지금 상태를 한 벌 더 백업(`docker compose run --rm backup once`)하고 진행한다. 원장 테이블(`Recommendation`, `AuditLog`)은 트리거로 행 수정·삭제가 막혀 있으므로, 데이터 되돌리기는 행 삭제가 아니라 아래처럼 DB를 새로 만들어 복원한다.

```bash
cd ~/visanjob/deploy
sudo ls /home/ubuntu/visanjob-backups/db                      # 복원할 파일 이름 고르기
F=/home/ubuntu/visanjob-backups/db/db-<날짜_시각>.dump        # 고른 파일
docker compose stop app worker backup
docker compose exec db dropdb -U visanjob --force visanjob
docker compose exec db createdb -U visanjob visanjob
sudo cat "$F" | docker compose exec -T db pg_restore -U visanjob -d visanjob --no-owner
docker compose up -d
```

- 성공: `pg_restore`가 오류 없이 끝나고, 라-6 확인표 1·3·4번이 정상.
- 비공개 파일 복원(필요할 때만, 볼륨 내용을 백업 시점으로 바꾼다):

  ```bash
  G=/home/ubuntu/visanjob-backups/files/private-files-<날짜_시각>.tar.gz
  docker compose stop app
  sudo cat "$G" | docker run --rm -i -v visanjob_private-files:/data postgres:17.9-bookworm sh -c 'find /data -mindepth 1 -delete && tar -xzf - -C /data'
  docker compose up -d
  ```

- 복원한 DB는 그 DB를 만든 `deploy/.env`의 `ENCRYPTION_KEYS`·`HASH_KEY`로만 읽힌다.

### 마-3. Lightsail 인스턴스 스냅샷 (권장)

서버 전체(디스크, Docker 볼륨, 백업 폴더 포함)를 통째로 보관하는 두 번째 안전장치다.

- 인스턴스 → **스냅샷(Snapshots)** 탭 → **자동 스냅샷** 켜기 → 시각 선택. Lightsail은 최근 자동 스냅샷 일부(공식 문서 기준 7개)를 보관한다.
- 업데이트 전에는 같은 탭에서 **수동 스냅샷 생성**.
- 스냅샷 저장 용량은 공식 요금표의 스냅샷 요금으로 청구된다. 오래된 수동 스냅샷은 지운다.
- 스냅샷에도 개인정보가 들어 있으므로 AWS 계정 보안(루트 MFA, 가-1)이 곧 백업 보안이다.

## (바) 업데이트 방법

```bash
cd ~/visanjob/deploy
docker compose run --rm backup once                                  # 1) 업데이트 전 백업
git -C ~/visanjob pull                                               # 2) 새 코드
IMAGE_TAG=$(git -C ~/visanjob rev-parse --short HEAD) docker compose build    # 3) 빌드
IMAGE_TAG=$(git -C ~/visanjob rev-parse --short HEAD) docker compose up -d    # 4) migrate 후 app·worker 교체
docker compose ps -a && docker compose logs --tail 50 migrate app worker
```

- 성공: 라-6 확인표 1·3·4번 정상, migrate `Exited (0)`.
- 문제가 생기면 이전 이미지로: `IMAGE_TAG=<이전 커밋 7자리> docker compose up -d`. 단, 이미 적용된 DB 마이그레이션은 되돌아가지 않으므로 그때는 마-2 복원(업데이트 전 백업)이 필요하다.
- 매번 태그를 쓰려면 `deploy/.env`의 `IMAGE_TAG=`에 적어 둔다.
- `SITE_URL`, 공개 `SITE_*`, `FEATURE_*`는 정적 페이지에 빌드 때 들어간다. 이 값을 바꾸면 3)·4)를 다시 한다.
- 세션 관련 변경이 있으면 배포 후 전원이 한 번 다시 로그인할 수 있다(Gate 4 운영 확인).
- 디스크 정리: `docker image prune` (사용 중이 아닌 이미지만). 디스크 사용량: `df -h /`.

## (사) 막혔을 때 공통 확인

| 증상                                           | 확인                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 어떤 컨테이너가 계속 재시작                    | `docker compose logs --tail 50 <서비스>`. 엔트리포인트 오류는 JSON 한 줄(`event`, `name`)로 남고 값은 출력하지 않는다                                                                                                                    |
| DB 접속 실패(`password authentication failed`) | `POSTGRES_PASSWORD`는 **DB 볼륨을 처음 만들 때만** 적용된다. 처음 실행 뒤 이 값을 바꿨다면 원래 값으로 되돌린다. 아직 데이터가 없을 때에 한해 `docker compose down -v`로 볼륨을 지우고 다시 시작할 수 있다(모든 데이터·업로드 파일 삭제) |
| 빌드 `Killed`                                  | 스왑(다-2) 확인. 빌드 중에는 다른 무거운 작업을 하지 않는다                                                                                                                                                                              |
| 사이트 접속 불가                               | 나-3 방화벽(80·443), 나-4 DNS, `docker compose logs caddy`                                                                                                                                                                               |
| 디스크 부족                                    | `df -h /`, `docker system df`, 백업 보관 개수(`BACKUP_KEEP`)                                                                                                                                                                             |

## (아) 운영 전환 (staging → visanjob.co.kr, 관리형 DB)

전환 전에 끝나 있어야 하는 것:

- [ ] Gate 4 **법무 확인 목록** 완료(README "Gate 4 법무 확인 목록": 수집 고지·동의, 면접 실명 제공 기간, 수령 기업 표시, 기업 가입 화면 고지), 약관·동의서 문구 확정(A-7)
- [ ] 실제 규칙·점수표 게시 여부(A-6), 번역 원어민 검수(A-7)
- [ ] 이메일 실제 발송 승인과 `SMTP_*` 설정(A-3) — 별도 승인
- [ ] 기능 플래그는 법무 확인 후 개별 결정(A-5). 정할 때까지 false
- [ ] 운영 DB: 스테이징 시험 데이터가 섞이지 않도록 **새 데이터베이스** 사용 권장(원장 테이블은 행 삭제 불가). 새 DB면 비밀값도 새로 생성할 수 있다

### 아-1. 관리형 PostgreSQL 만들기 (서울, SSL)

1. 같은 서울 리전에 관리형 PostgreSQL을 만든다(예: Lightsail 데이터베이스). 개발·테스트·스테이징과 같은 **PostgreSQL 17** 계열. 요금은 공식 요금표에서 확인한다.
2. **공개 접근(public mode)은 끈다.** 같은 리전의 서버는 내부(private) 엔드포인트로 접속한다.
3. 데이터베이스 이름 `visanjob`, 마스터 사용자·비밀번호를 정한다. 비밀번호는 비밀번호 관리자에만 보관한다. 앱 사용자는 테이블·트리거 생성(마이그레이션)과 `pgboss` 스키마 생성(워커) 권한이 필요하다.
4. 자동 백업(일일 스냅샷)과 보존 기간을 켠다.

### 아-2. DB 인증서(루트 CA)

워커(pg-boss, node-postgres)는 `sslmode=require`를 **서버 인증서 검증까지** 하는 모드로 처리한다. 제공사의 루트 CA 번들(예: AWS RDS 문서의 "global bundle", Lightsail DB도 RDS 인증서 사용)을 **제공사 공식 문서에서** 받아 서버의 `~/visanjob/deploy/certs/db-ca.pem`에 둔다. 컴포즈가 `NODE_EXTRA_CA_CERTS=/certs/db-ca.pem`으로 읽는다.

- 외부 DB인데 이 파일이 없으면 앱·워커 로그에 `config.database_ca_missing` 경고가 남고, 워커가 DB 연결에서 실패한다.
- `sslmode`가 없는 외부 DB 주소는 `config.database_without_sslmode` 경고가 남는다.

### 아-3. 데이터 옮기기와 설정 바꾸기

1. (스테이징 데이터를 그대로 쓸 때만) 마지막 덤프를 관리형 DB로 복원한다. 새 DB로 시작하면 이 단계는 건너뛰고 6번에서 시드한다.

   ```bash
   cd ~/visanjob/deploy && docker compose stop app worker && docker compose run --rm backup once
   sudo cat /home/ubuntu/visanjob-backups/db/<가장 최근 파일>.dump | docker run --rm -i postgres:17.9-bookworm pg_restore --no-owner -d '<관리형 DB 주소, sslmode=require 포함>'
   ```

2. `deploy/.env`:
   - `COMPOSE_PROFILES=` (비움 → `db` 컨테이너를 쓰지 않음)
   - `DATABASE_URL=postgresql://사용자:비밀번호@내부엔드포인트:5432/visanjob?sslmode=require` (비밀번호의 `@ : / ? # %`는 URL 인코딩)
   - `SITE_URL=https://visanjob.co.kr`, `AUTH_URL=https://visanjob.co.kr`
3. DNS: `visanjob.co.kr`(A), 필요하면 `www.visanjob.co.kr`(A) → 고정 IP.
4. `deploy/Caddyfile`: 운영 블록 주석 해제. 스테이징 블록은 지우거나 별도 용도로 남긴다. 운영 블록에는 **basic_auth와 `X-Robots-Tag`가 없다**(검색 허용, 비공개 영역의 noindex는 앱이 붙임). `/robots.txt`는 앱이 응답한다. 스테이징 블록을 지웠다면 compose의 `STAGING_BASIC_AUTH_*` 필수 표시(`:?`)도 함께 정리한다.
5. 다시 빌드(정적 페이지에 `SITE_URL`이 들어가므로 필수)와 실행, 그리고 내부 DB 컨테이너 정지:

   ```bash
   docker compose build && docker compose up -d
   docker compose --profile local-db stop db
   ```

   - 확인: 앱·워커 로그에 `config.database_ca_missing`·`config.database_without_sslmode`가 **없어야** 한다.
   - `db-data` 볼륨(스테이징 DB)은 전환이 확인될 때까지 지우지 않는다.

6. 새 DB면 `docker compose run --rm seed`로 참조 데이터·첫 관리자 생성(라-5).
7. 백업: `backup` 서비스는 같은 `DATABASE_URL`(관리형 DB)을 덤프하므로 그대로 동작한다(`sslmode`를 그대로 사용). 관리형 DB 자체의 자동 백업도 켜 둔다(아-1).
8. 확인: 라-6 확인표를 운영 주소로 반복하되, 6·7·8번은 반대로 — 인증 없이 200, 공개 페이지에 `x-robots-tag` 없음, `/robots.txt`가 앱의 허용 규칙과 사이트맵 표시. 관리자·로그인 화면에는 여전히 `noindex`. 2번(DB 포트)은 해당 없음.
