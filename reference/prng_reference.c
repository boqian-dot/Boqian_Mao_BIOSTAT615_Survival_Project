/* xoshiro128** 1.1, David Blackman and Sebastiano Vigna (2018).
   Public-domain reference: https://prng.di.unimi.it/xoshiro128starstar.c
   Permission to use, copy, modify, and/or distribute this software for any
   purpose with or without fee is hereby granted. THE SOFTWARE IS PROVIDED
   "AS IS", WITHOUT WARRANTY. Full original notice: reference/NUMERICS.md.

   Independent C harness for the TypeScript integer arithmetic and jump.
   Generate: cc -O2 reference/prng_reference.c -o /tmp/survival-prng-reference
             /tmp/survival-prng-reference > tests/fixtures/prng-reference.json
*/
#include <stdint.h>
#include <stdio.h>
static uint32_t s[4];
static uint32_t rotl(uint32_t x,int k) { return (x << k) | (x >> (32-k)); }
static uint32_t next(void) {
  const uint32_t result=rotl(s[1]*5,7)*9;
  const uint32_t t=s[1]<<9;
  s[2]^=s[0]; s[3]^=s[1]; s[1]^=s[2]; s[0]^=s[3];
  s[2]^=t; s[3]=rotl(s[3],11); return result;
}
static void jump(void) {
  const uint32_t poly[]={0x8764000b,0xf542d2d3,0x6fa035c3,0x77f2db5b};
  uint32_t out[4]={0,0,0,0};
  for(int i=0;i<4;i++) for(int b=0;b<32;b++) {
    if(poly[i] & ((uint32_t)1 << b)) for(int j=0;j<4;j++) out[j]^=s[j];
    next();
  }
  for(int j=0;j<4;j++) s[j]=out[j];
}
static void seed(uint32_t counter) {
  for(int i=0;i<4;i++) {
    uint32_t z=(counter+=0x9e3779b9);
    z=(z^(z>>16))*0x85ebca6b; z=(z^(z>>13))*0xc2b2ae35;
    s[i]=z^(z>>16);
  }
}
static void values(void) {
  printf("["); for(int i=0;i<16;i++) printf("%s%u",i?",":"",next()); printf("]");
}
int main(void) {
  printf("{\n  \"algorithm\":\"xoshiro128** 1.1; fixed 32-bit seed expansion; dropout jump 2^64\",\n  \"seed\":6152026,\n  \"eventUint32\":");
  seed(6152026); values();
  printf(",\n  \"dropoutUint32\":"); seed(6152026); jump(); values();
  printf("\n}\n"); return 0;
}
