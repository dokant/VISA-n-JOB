# 비자앤잡 배포 절차 (A-8, DECISIONS Q-30)

구성: 서울 리전 리눅스 서버 1대에서 Docker로 **Caddy(자동 HTTPS) → 앱(Next.js)**, **워커(pg-boss)**, **마이그레이션(1회)**을 돌리고, DB는 **서울 리전 관리형 PostgreSQL**을 쓴다. 비공개 업로드 파일(소개 확인서, R-210)은 앱 컨테이너에만 붙는 Docker 볼륨 `private-files`에 둔다.

먼저 **비공개 스테이징**(`staging.visanjob.co.kr`: 기본 인증, 검색 차단)을 열고, 법무 확인이 끝난 뒤 운영(`visanjob.co.kr`)으로 전환한다.

```
인터넷 ──80/443──▶ caddy ──(내부망)──▶ app:3000 ──▶ 관리형 PostgreSQL (sslmode=require)
                                         worker  ──▶ 〃
                                         migrate ──▶ 〃 (시작 시 1회)
```

| 파일                             | 역할                                                                    |
| -------------------------------- | ----------------------------------------------------------------------- |
| `Dockerfile`                     | 운영 이미지 1개(`app`·`worker`·`migrate`·`seed` 명령). 테스트 도구 없음 |
| `deploy/docker-compose.yml`      | 서비스 구성, 재시작 정책, 헬스체크, 볼륨                                |
| `deploy/Caddyfile`               | 스테이징 블록(기본 인증·noindex·robots 차단), 운영 블록(주석)           |
| `deploy/.env.production.example` | 서버 환경 변수 목록(값 없음) → 서버에서 `deploy/.env`로 복사해 채움     |
| `deploy/docker-entrypoint.sh`    | 명령별 필수 환경 변수 확인. 빠지면 컨테이너가 시작하지 않음             |
| `scripts/gen-secrets.ts`         | 비밀값 생성 → 파일에만 기록, 화면에는 변수 이름만                       |

> 이 문서의 명령은 사람이 서버에서 실행한다. 비용은 제공사 요금표에서 직접 확인한다(이 문서는 추정하지 않는다).

---

## 1. 서버 만들기

1. 클라우드 콘솔(예: AWS Lightsail)에서 **서울 리전(ap-northeast-2)** 인스턴스를 만든다.
   - OS: Ubuntu LTS(예: 24.04)
   - 메모리 **2GB 이상**. 이미지 빌드(`next build`)가 메모리를 많이 쓰므로 2GB면 스왑을 추가한다(아래).
   - SSH 키 접속만 사용(비밀번호 로그인 끔).
2. **고정 IP(Static IP)**를 만들어 인스턴스에 붙인다(DNS가 이 주소를 가리킨다).
3. 스왑(메모리 2GB일 때):
   ```bash
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
   sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
4. 보안 업데이트 자동 적용: `sudo apt-get update && sudo apt-get install -y unattended-upgrades`.

## 2. 관리형 PostgreSQL (서울, SSL)

1. 같은 서울 리전에 관리형 PostgreSQL을 만든다(예: Lightsail 데이터베이스). 개발·테스트와 같은 **PostgreSQL 17** 계열 권장.
2. **공개 접근(public mode)은 끈다.** 같은 리전의 서버는 내부(private) 엔드포인트로 접속한다.
3. 데이터베이스 이름 `visanjob`(또는 원하는 이름), 마스터 사용자·비밀번호를 정한다. 비밀번호는 비밀번호 관리자에만 보관한다.
   - 앱 사용자는 테이블·트리거 생성(마이그레이션)과 `pgboss` 스키마 생성(워커) 권한이 필요하다.
4. 접속 문자열(`deploy/.env`의 `DATABASE_URL`):
   ```
   postgresql://사용자:비밀번호@내부엔드포인트:5432/visanjob?sslmode=require
   ```
   비밀번호에 `@ : / ? # %` 같은 문자가 있으면 URL 인코딩한다.
5. **DB 인증서(루트 CA)**: 워커(pg-boss, node-postgres)는 `sslmode=require`를 서버 인증서 검증까지 하는 모드로 처리한다. 제공사의 루트 CA 번들(예: AWS RDS 문서의 "global bundle", Lightsail DB도 RDS 인증서 사용)을 제공사 공식 문서에서 받아 서버의 `deploy/certs/db-ca.pem`에 둔다. 컴포즈가 `NODE_EXTRA_CA_CERTS`로 읽는다. 없으면 워커가 DB 연결에서 실패한다.
6. 자동 백업(일일 스냅샷)과 보존 기간을 켠다(아래 "백업").

## 3. 방화벽

인스턴스 방화벽(Lightsail "네트워킹")에서 연다:

| 포트 | 프로토콜 | 대상                              |
| ---- | -------- | --------------------------------- |
| 22   | TCP      | 관리자 IP만(가능하면)             |
| 80   | TCP      | 전체 (인증서 발급·HTTPS 리디렉트) |
| 443  | TCP      | 전체                              |
| 443  | UDP      | 전체 (HTTP/3, 선택)               |

앱 포트 3000은 호스트에 열지 않는다(컴포즈가 publish하지 않음, Caddy만 내부망으로 접근). Docker가 연 포트는 `ufw` 규칙을 우회하므로 클라우드 방화벽을 기준으로 관리한다.

## 4. DNS

도메인 관리 화면에서 **A 레코드** `staging.visanjob.co.kr → 고정 IP`를 만든다. 전파 확인: `dig +short staging.visanjob.co.kr`.
Caddy는 첫 시작 때 이 이름으로 Let's Encrypt 인증서를 받으므로 DNS가 먼저 맞아야 한다.

## 5. Docker 설치

Docker 공식 문서("Install Docker Engine on Ubuntu")의 apt 저장소 방식으로 Docker Engine과 Compose 플러그인을 설치한다.

```bash
sudo usermod -aG docker "$USER"   # 다시 로그인하면 sudo 없이 docker 사용
docker version && docker compose version
```

## 6. 저장소 가져오기 (비공개 저장소, deploy key)

저장소는 비공개로 두고 서버에는 **읽기 전용 deploy key**만 준다.

1. (사람) 이 로컬 저장소를 비공개 원격 저장소(예: GitHub private)에 올린다. 현재는 로컬 커밋만 있다.
2. 서버에서 키를 만든다:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/visanjob_deploy -N "" -C "visanjob-staging-deploy"
   cat ~/.ssh/visanjob_deploy.pub
   ```
3. 저장소 설정 → Deploy keys → 공개키 등록(**Allow write access 끄기**).
4. `~/.ssh/config`:
   ```
   Host github-visanjob
     HostName github.com
     User git
     IdentityFile ~/.ssh/visanjob_deploy
     IdentitiesOnly yes
   ```
5. 클론:
   ```bash
   sudo mkdir -p /opt/visanjob && sudo chown "$USER": /opt/visanjob
   git clone github-visanjob:<조직>/<저장소>.git /opt/visanjob
   cd /opt/visanjob
   ```

## 7. 비밀값 생성과 `deploy/.env` 배치

```bash
cd /opt/visanjob
cp deploy/.env.production.example deploy/.env
chmod 600 deploy/.env
# 서버에 Node가 없으므로 공식 node 이미지로 실행한다. 값은 파일에만 쓰이고 화면에는 이름만 나온다.
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD":/w -w /w node:24-bookworm-slim \
  node scripts/gen-secrets.ts deploy/.env
```

- 채워지는 값: `AUTH_SECRET`, `ENCRYPTION_KEYS`(`1:` + base64 32바이트), `HASH_KEY`, `INGEST_API_KEY`, `SEED_ADMIN_PASSWORD` — 개발용 `.env`와 같은 형식(Q-08). 이미 값이 있는 변수는 바꾸지 않는다.
- 이어서 편집기(`nano deploy/.env`)로 직접 채운다:
  - `SITE_URL=https://staging.visanjob.co.kr`, `AUTH_URL=https://staging.visanjob.co.kr`
  - `TRUST_PROXY=true`(예시 기본값 유지)
  - `DATABASE_URL=...?sslmode=require`
  - `SEED_ADMIN_EMAIL=` 첫 관리자 이메일
  - `FEATURE_*` 4종은 **모두 false 유지**(법무 확인 전, A-5)
  - `SMTP_*`는 **모두 비워 둔다**(실제 발송은 A-3 별도 승인)
- **`deploy/.env` 사본을 비밀번호 관리자 등 서버 밖 안전한 곳에 보관한다.** `ENCRYPTION_KEYS`·`HASH_KEY`를 잃으면 DB의 암호화 필드를 읽을 수 없다.

## 8. 기본 인증(basic_auth) 비밀번호 해시

스테이징 접속용 아이디·비밀번호를 정하고, 해시만 서버에 둔다(평문은 저장하지 않음).

```bash
docker run --rm -it caddy:2.10-alpine caddy hash-password   # 비밀번호를 두 번 입력 → 해시 출력
```

`deploy/.env`:

```
STAGING_BASIC_AUTH_USER=원하는아이디
STAGING_BASIC_AUTH_HASH='$2a$14$...출력된 해시...'
```

해시에는 `$`가 있으므로 **반드시 작은따옴표**로 감싼다.

## 9. 빌드와 시작

```bash
cd /opt/visanjob/deploy
docker compose build                 # 빌드 중 인터넷 필요(npm, Prisma 엔진, Google Fonts)
docker compose up -d                 # migrate(1회) → app·worker → caddy
docker compose ps
docker compose logs migrate          # "All migrations have been successfully applied" 등, 종료 코드 0
```

- `SITE_URL`, 공개 `SITE_*`, `FEATURE_*`는 정적 페이지에 빌드 시 들어간다. 이 값을 바꾸면 `docker compose build` 후 `up -d`를 다시 한다.
- 필수 환경 변수가 빠지면 컨테이너가 `{"level":"error","event":"config.missing","name":"..."}`를 남기고 멈춘다(값은 출력하지 않음). 개발용 임베디드 DB 포트(54320·54329)를 가리켜도 멈춘다.

## 10. 관리자 계정 시드

```bash
cd /opt/visanjob/deploy
docker compose run --rm seed     # 참조 데이터(시·도, 업종, 비자 유형, SAMPLE 규칙 DRAFT) + 첫 관리자
```

- 출력의 `"admin":"created"`를 확인한다(이미 있으면 `exists`). 샘플 구직자는 만들지 않는다(`SEED_SAMPLE_SEEKERS=false`, 운영 모드에서 거부).
- 초기 비밀번호는 `deploy/.env`의 `SEED_ADMIN_PASSWORD`. 공유 화면이 아닌 곳에서 확인한다.
- `https://staging.visanjob.co.kr/admin/login` 로그인 → **TOTP 2단계 인증 등록** → 로그아웃 → 다시 로그인해 2FA 확인.
- 확인 후 `deploy/.env`에서 `SEED_ADMIN_PASSWORD` 줄을 지운다(다음 시드 때 계정은 다시 만들지 않음).
- 시드 데이터의 규칙·점수표는 SAMPLE 초안(BR-12), 시·군·구는 검토 필요 표시(PC-6)다. 실제 값은 행정사가 관리자 화면에서 입력한다(A-6).

## 11. 동작 확인 체크리스트

`USER`는 기본 인증 아이디. `-u USER`만 주면 curl이 비밀번호를 묻는다.

| #   | 확인                  | 명령 / 방법                                                                                                       | 기대 결과                                                                                                                                  |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 컨테이너 상태         | `docker compose ps`                                                                                               | app `healthy`, worker·caddy `running`, migrate `exited (0)`                                                                                |
| 2   | 헬스체크(내부)        | `docker compose exec app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"` | `{"status":"ok"}`                                                                                                                          |
| 3   | 헬스체크(외부)        | `curl -s -u USER https://staging.visanjob.co.kr/api/health`                                                       | `{"status":"ok"}`                                                                                                                          |
| 4   | HTTPS 리디렉트·인증서 | `curl -sI http://staging.visanjob.co.kr/ko`                                                                       | 308 → `https://`. 브라우저 자물쇠 정상                                                                                                     |
| 5   | 기본 인증             | `curl -sI https://staging.visanjob.co.kr/ko`                                                                      | `401`                                                                                                                                      |
| 6   | 검색 차단 헤더        | `curl -sI https://staging.visanjob.co.kr/ko` 와 `curl -sI -u USER https://staging.visanjob.co.kr/ko`              | 두 응답 모두 `x-robots-tag: noindex, nofollow` (두 번째는 200)                                                                             |
| 7   | robots.txt            | `curl -s https://staging.visanjob.co.kr/robots.txt`                                                               | `User-agent: *` / `Disallow: /` (인증 없이)                                                                                                |
| 8   | 관리자 리디렉트(O-9)  | `curl -sI -u USER https://staging.visanjob.co.kr/admin`                                                           | `location: https://staging.visanjob.co.kr/admin/login` (localhost 아님)                                                                    |
| 9   | 언어 리디렉트         | `curl -sI -u USER https://staging.visanjob.co.kr/`                                                                | `location`이 `/ko` 또는 `https://staging.visanjob.co.kr/ko`                                                                                |
| 10  | 로그인·2FA            | 브라우저: `/admin/login` → 비밀번호 → TOTP → `/admin`                                                             | 관리자 화면 진입, 로그아웃 후 `/admin`은 로그인 화면으로                                                                                   |
| 11  | 워커 시작             | `docker compose logs worker`                                                                                      | `worker.started`, `notification.provider`(console)                                                                                         |
| 12  | 워커 경고(정상)       | 같은 로그                                                                                                         | `status_check.transition_disabled` / `NO_REAL_CHANNEL` 경고 — 실제 채널 없음 → 상태 확인 전이 비활성(Q-27). **SMTP 승인(A-3) 전에는 정상** |
| 13  | 기능 플래그 꺼짐      | 브라우저 `/ko/jobs`, `curl -s -o /dev/null -w '%{http_code}' -u USER https://staging.visanjob.co.kr/api/jobs`     | 준비 중 화면, API `404`                                                                                                                    |
| 14  | 비공개 파일 볼륨      | `docker compose exec app sh -c 'ls -ld /data/private'`                                                            | `node` 소유, 권한 `drwx------`                                                                                                             |
| 15  | 오류 로그             | `docker compose logs app --since 10m \| grep '"level":"error"'`                                                   | 없음                                                                                                                                       |

## 12. 백업

- **DB**: 관리형 DB의 자동 일일 스냅샷과 보존 기간을 켠다. 업데이트 배포 전에는 **수동 스냅샷**을 하나 만든다. 복원은 새 DB로 만든 뒤 `DATABASE_URL`을 바꾼다. 원장 테이블(`Recommendation`, `AuditLog`)은 트리거로 수정·삭제가 막혀 있으므로 데이터 정리는 행 삭제가 아니라 스냅샷 복원으로 한다.
- **비공개 파일 볼륨**(`visanjob_private-files`, 개인정보 포함):
  ```bash
  sudo mkdir -p /opt/visanjob-backups && sudo chmod 700 /opt/visanjob-backups
  docker run --rm -v visanjob_private-files:/data:ro -v /opt/visanjob-backups:/backup busybox \
    tar czf /backup/private-files-$(date +%F).tar.gz -C /data .
  ```
  서버 밖 접근 제한된 저장소로 옮기고, 오래된 사본은 보존 기간에 맞춰 지운다. 인스턴스 스냅샷도 함께 쓰면 볼륨이 포함된다.
- **`deploy/.env`**: 서버 밖(비밀번호 관리자)에 보관. 암호화 키 없이는 DB 백업을 읽을 수 없다. 반대로 DB 백업과 키를 같은 곳에 두지 않는다.
- Caddy 인증서 볼륨(`caddy-data`)은 잃어도 다시 발급된다.

## 13. 업데이트 배포

```bash
# 1) 관리형 DB 수동 스냅샷 생성 (콘솔)
cd /opt/visanjob
git pull
cd deploy
IMAGE_TAG=$(git rev-parse --short HEAD) docker compose build
IMAGE_TAG=$(git rev-parse --short HEAD) docker compose up -d   # migrate가 새 마이그레이션 적용 후 app·worker 교체
docker compose ps && docker compose logs --tail 50 migrate app worker
```

- 매번 `IMAGE_TAG`를 쓰려면 `deploy/.env`의 `IMAGE_TAG=`에 적어 둔다. 문제가 생기면 이전 태그로 `IMAGE_TAG=<이전> docker compose up -d`. 단, 이미 적용된 DB 마이그레이션은 되돌아가지 않으므로 그때는 스냅샷 복원이 필요하다.
- 세션 관련 변경이 있으면 배포 후 전원이 한 번 다시 로그인할 수 있다(Gate 4 운영 확인).
- 오래된 이미지 정리: `docker image prune` (사용 중이 아닌 이미지만).

## 14. 운영 전환 (staging → visanjob.co.kr)

전환 전에 끝나 있어야 하는 것:

- [ ] Gate 4 **법무 확인 목록** 완료(README "Gate 4 법무 확인 목록": 수집 고지·동의, 면접 실명 제공 기간, 수령 기업 표시, 기업 가입 화면 고지), 약관·동의서 문구 확정(A-7)
- [ ] 실제 규칙·점수표 게시 여부(A-6), 번역 원어민 검수(A-7)
- [ ] 이메일 실제 발송 승인과 `SMTP_*` 설정(A-3) — 별도 승인
- [ ] 기능 플래그는 법무 확인 후 개별 결정(A-5). 정할 때까지 false
- [ ] 운영 DB: 스테이징 시험 데이터가 섞이지 않도록 **새 데이터베이스** 사용 권장(원장 테이블은 행 삭제 불가). 새 DB면 비밀값도 새로 생성 가능

전환 작업:

1. DNS: `visanjob.co.kr`(A), 필요하면 `www.visanjob.co.kr`(A) → 고정 IP.
2. `deploy/.env`: `SITE_URL=https://visanjob.co.kr`, `AUTH_URL=https://visanjob.co.kr`, (새 DB면) `DATABASE_URL` 교체.
3. `deploy/Caddyfile`: 운영 블록 주석 해제. 스테이징 블록은 지우거나 별도 용도로 남긴다. 운영 블록에는 **basic_auth와 `X-Robots-Tag`가 없다**(검색 허용, 비공개 영역의 noindex는 앱이 붙임). `/robots.txt`는 앱이 응답한다.
4. 다시 빌드(정적 페이지에 `SITE_URL`이 들어가므로 필수): `docker compose build && docker compose up -d`. 스테이징 블록을 지웠다면 compose의 `STAGING_BASIC_AUTH_*` 필수 표시(`:?`)도 함께 정리한다.
5. 새 DB면 `docker compose run --rm seed`로 참조 데이터·첫 관리자 생성(10절).
6. 확인: 11절 체크리스트를 운영 주소로 반복하되, 5·6·7번은 반대로 — 인증 없이 200, 공개 페이지에 `x-robots-tag` 없음, `/robots.txt`가 앱의 허용 규칙과 사이트맵 표시. 관리자·로그인 화면에는 여전히 `noindex`.
