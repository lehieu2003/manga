# Quy Trinh RAG Chatbot

Reader: developer hoac maintainer moi vao project MangaDex Reader.

Post-read action: hieu chatbot RAG hien tai chay qua nhung buoc nao, biet can index du lieu ra sao, va biet vi sao chatbot chi tra loi duoc trong pham vi metadata dang co.

## Tom Tat Ngan

RAG chatbot la floating chat assistant trong app. User phai dang nhap moi dung duoc.

Chatbot khong doc truc tiep anh manga. No tra loi dua tren du lieu da co trong database, gom metadata manga, metadata chapter, library cua user, tien do doc, va lich su search.

Luon co hai pha rieng:

1. **Index truoc**: bien manga metadata thanh vector de search theo ngu nghia.
2. **Chat sau**: user hoi, backend tim context lien quan trong vector store, roi moi goi model viet cau tra loi.

## Du Lieu Chatbot Dang Dung

Nguon du lieu chinh:

- manga da cache tu MangaDex
- chapter da cache tu MangaDex
- library cua user
- manga favorite
- tien do doc cua user
- lich su search cua user

Manga metadata gom nhung thong tin nhu:

- title
- alternative titles
- description
- tags
- authors
- artists
- status
- year
- content rating
- cover image
- so chapter doc duoc

Chapter metadata gom:

- manga title
- chapter number
- chapter title
- translated language
- page count
- scanlation group

Quan trong: chapter metadata khong phai noi dung chapter. App hien chua OCR anh manga va chua luu text noi dung trang truyen.

## Pha 1: Index Du Lieu

Index la buoc chuan bi du lieu cho RAG.

Lenh thuong dung:

```bash
docker compose run --rm backend npm run index:rag -- --limit=1000
```

Lenh nay lam cac viec sau:

1. Doc manga metadata trong database.
2. Tao mot text document ngan cho moi manga.
3. Goi OpenAI embedding model de bien text thanh vector.
4. Luu vector vao PostgreSQL bang pgvector.
5. Neu manga da index va noi dung khong doi thi bo qua.

Neu them `--chapters`, indexer se tao them document cho chapter metadata:

```bash
docker compose run --rm backend npm run index:rag -- --limit=1000 --chapters
```

Khong can `--chapters` cho MVP recommendation. Manga-level documents da du cho cac cau hoi goi y va discovery.

## Text Document Trong RAG La Gi

Moi manga duoc bien thanh mot doan text kieu:

```text
Type: Manga
Title: ...
Alternative titles: ...
Description: ...
Tags: ...
Authors: ...
Artists: ...
Status: ...
Year: ...
Content rating: ...
Available languages: ...
Readable chapters: ...
```

Doan text nay duoc dua vao embedding model. Vector sinh ra dai dien cho y nghia cua manga do.

Vi vay khi user hoi:

```text
Recommend completed action manga
```

Backend se tim cac manga co vector gan nghia voi "completed action manga".

## Pha 2: User Hoi Chatbot

Khi user gui message tu floating chat widget, frontend goi backend chat endpoint.

Backend xu ly theo thu tu:

1. Kiem tra user da dang nhap.
2. Luu user message vao conversation.
3. Dung model nho de phan tich y dinh cau hoi.
4. Tao embedding cho cau hoi.
5. Search pgvector de lay cac RAG documents lien quan.
6. Lay them user context nhu library, favorite, progress, search history.
7. Gom context thanh prompt.
8. Dung model viet cau tra loi cuoi.
9. Luu assistant message vao database.
10. Tra ve answer va source cards cho frontend.

## Intent Extraction

Backend dung model nho de phan loai cau hoi.

Nhung intent hien co:

- recommendation
- catalog question
- continue reading
- reader help
- unknown

Model cung co the rut ra filter:

- tags
- status
- content rating
- year
- manga id
- source type manga/chapter

Neu phan tich intent loi, backend fallback ve cau hoi goc cua user.

## Retrieval

Retrieval la buoc tim context.

Backend:

1. Bien cau hoi user thanh embedding vector.
2. Search trong PostgreSQL pgvector.
3. Tinh score dua tren cosine similarity.
4. Bo document co score qua thap.
5. Dua cac document tot nhat vao prompt.

Hien tai recommendation va catalog question uu tien `MANGA` documents. Ly do la chapter metadata co the tao noise neu user chi muon goi y manga.

Chapter documents chi nen dung khi user hoi ve chapter, vi du:

- "chapter moi nhat la gi?"
- "toi doc tiep chuong nao?"
- "co chapter tieng Viet khong?"

## Personalization

Vi chatbot bat buoc dang nhap, backend co the them user context.

Context nay gom:

- manga trong library
- manga favorite
- chapter doc gan day
- page index gan day
- search gan day

Context nay giup chatbot tra loi nhung cau nhu:

```text
What should I continue reading?
```

hoac:

```text
Suggest something based on my library.
```

## Answer Generation

Backend dung model viet cau tra loi cuoi.

Prompt hien tai ep chatbot:

- tra loi ngan
- khong dung markdown
- recommendation toi da 3 item
- moi item co ly do ngan
- chi dua vao retrieved context va user context
- khong noi nhu the no biet noi dung anh manga
- khong lap lai source id hoac score trong text

Source cards duoc render rieng tren UI, nen answer text khong can nhac qua nhieu metadata.

## Source Cards

Backend tra ve sources cho frontend.

Moi source card co:

- type: manga hoac chapter
- id
- title
- cover image neu co
- reason
- score

Frontend hien card co anh cover. Bam vao card se mo manga detail hoac reader route.

## Conversation Persistence

Chatbot luu lich su chat.

Du lieu duoc luu gom:

- conversation cua user
- user messages
- assistant messages
- sources
- suggested actions
- model da dung
- token usage neu provider tra ve
- latency

Moi conversation duoc scope theo user id. User khong doc duoc conversation cua user khac.

## Dieu Chatbot Lam Duoc Tot Hien Tai

Chatbot phu hop cho:

- goi y manga theo tag, status, genre, vibe
- hoi ve manga trong catalog
- hoi nen doc tiep gi dua tren library/progress
- mo manga tu source card
- tra loi dua tren metadata da index

## Gioi Han Hien Tai

Chatbot chua phu hop cho:

- tom tat noi dung chapter dua tren anh manga
- tra loi chinh xac noi dung tung trang truyen
- phan tich panel/hinh anh
- hanh dong tu dong sua library
- streaming response
- auto re-index sau moi lan sync catalog

Neu can cac tinh nang nay, can them du lieu hoac workflow moi.

## Khi Nao Can Chay Index Lai

Can chay index lai khi:

- sync them manga moi
- update metadata manga
- thay doi document builder
- doi embedding model
- muon them chapter documents

Neu document khong doi, indexer se skip de tranh ton chi phi embedding.

## Lenh Hay Dung

Index manga-level:

```bash
docker compose run --rm backend npm run index:rag -- --limit=1000
```

Index ca chapter metadata:

```bash
docker compose run --rm backend npm run index:rag -- --limit=1000 --chapters
```

Kiem tra backend dang chay:

```bash
docker compose ps
```

Kiem tra health:

```bash
curl http://localhost:4000/health/ready
```

## Mot Luong Hoan Chinh

```text
MangaDex sync
-> CachedManga / CachedChapter
-> index:rag
-> build text documents
-> OpenAI embeddings
-> RagDocument in PostgreSQL pgvector
-> user asks in floating chat
-> classify intent
-> embed user question
-> pgvector retrieval
-> add user library/progress context
-> generate short answer
-> return answer + source cards
-> frontend renders chat with cover images
```

## Ket Luan

RAG chatbot hien tai la metadata-based assistant. No khong "doc truyen" nhu con nguoi, ma tim metadata lien quan bang vector search, dua metadata do vao model, va yeu cau model tra loi ngan gon dua tren context.

Day la nen tang tot cho discovery va recommendation. De thanh reader assistant day du, buoc tiep theo la mo rong context chapter/progress va them action flow co confirm ro rang.
