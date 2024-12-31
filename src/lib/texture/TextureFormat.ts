import { ByteType, FloatType, IntType, RedFormat, RedIntegerFormat, RGBAFormat, RGBAIntegerFormat, RGBFormat, RGBIntegerFormat, RGFormat, RGIntegerFormat, UnsignedIntType, type PixelFormat, type TextureDataType } from "three";

export type TextureFormat = {
  type: TextureDataType,
  format: PixelFormat,
};

export const Int = {
  type: IntType,
  format: RedIntegerFormat,
};

export const Int2 = {
  type: IntType,
  format: RGIntegerFormat,
};

export const Int3 = {
  type: IntType,
  format: RGBIntegerFormat,
};

export const Int4 = {
  type: IntType,
  format: RGBAIntegerFormat,
};

export const Float = {
  type: FloatType,
  format: RedFormat,
};

export const Float2 = {
  type: FloatType,
  format: RGFormat,
};

export const Float3 = {
  type: FloatType,
  format: RGBFormat,
};

export const Float4 = {
  type: FloatType,
  format: RGBAFormat,
};

export const Uint = {
  type: UnsignedIntType,
  format: RedIntegerFormat,
};

export const Uint2 = {
  type: UnsignedIntType,
  format: RGIntegerFormat,
};

export const Uint3 = {
  type: UnsignedIntType,
  format: RGBIntegerFormat,
};

export const Uint4 = {
  type: UnsignedIntType,
  format: RGBAIntegerFormat,
};

export const Byte = {
  type: ByteType,
  format: RedIntegerFormat,
};

export const Byte2 = {
  type: ByteType,
  format: RGIntegerFormat,
};

export const Byte3 = {
  type: ByteType,
  format: RGBIntegerFormat,
};

export const Byte4 = {
  type: ByteType,
  format: RGBAIntegerFormat,
};