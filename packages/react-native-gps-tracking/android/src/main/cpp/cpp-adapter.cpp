#include <jni.h>
#include <fbjni/fbjni.h>
#include "NitroGpsTrackingOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::gpstracking::registerAllNatives();
  });
}