#include <cstddef>
#include <limits.h>
#include <assert.h>

#include "jw_util/fastmath.h"

template <unsigned int bits>
class BitBoard {
public:
    typedef std::size_t DataType;

    static constexpr unsigned int word_bits = sizeof(DataType) * CHAR_BIT;
	static constexpr unsigned int size = jw_util::FastMath::div_ceil(bits, word_bits);

	template <typename... BitsTypes>
    static BitBoard<bits> from_bits(BitsTypes... poses) {
		BitBoard<bits> res;
		res.clear();
        res.set_bits(poses...);
		return res;
	}

	template <signed int interval>
    static BitBoard<bits> get_pattern(signed int start) {
		static constexpr unsigned int initial_start = interval > 0 ? 0 : size - 1;
		static BitBoard<bits> initial = make_pattern<interval>(initial_start);
		return initial.shift<start - initial_start>();
	}

	void clear() {
		data.fill(0);
	}

    BitBoard<bits> operator~() const {
        BitBoard<bits> res;
        for (unsigned int i = 0; i < size; i++) {
            res.data[i] = ~data[i];
        }
        return res;
    }

	BitBoard<bits> operator&(const BitBoard<bits> &other) const {
		BitBoard<bits> res;
		for (unsigned int i = 0; i < size; i++) {
			res.data[i] = data[i] & other.data[i];
		}
		return res;
	}
    BitBoard<bits>& operator &=(const BitBoard<bits> &other) {
        for (unsigned int i = 0; i < size; i++) {
            data[i] &= other.data[i];
        }
        return (*this);
    }

	BitBoard<bits> operator|(const BitBoard<bits> &other) const {
		BitBoard<bits> res;
		for (unsigned int i = 0; i < size; i++) {
			res.data[i] = data[i] | other.data[i];
		}
		return res;
	}
    BitBoard<bits>& operator |=(const BitBoard<bits> &other) {
        for (unsigned int i = 0; i < size; i++) {
            data[i] |= other.data[i];
        }
        return (*this);
    }

	BitBoard<bits> operator^(const BitBoard<bits> &other) const {
		BitBoard<bits> res;
		for (unsigned int i = 0; i < size; i++) {
			res.data[i] = data[i] ^ other.data[i];
		}
		return res;
	}
    BitBoard<bits>& operator ^=(const BitBoard<bits> &other) {
        for (unsigned int i = 0; i < size; i++) {
            data[i] ^= other.data[i];
        }
        return (*this);
    }

	template <signed int offset>
    BitBoard<bits> shift() const {
        static_assert(abs(offset) < bits, "Cannot shift by that many bits");

        BitBoard<bits> res;

        if (offset > 0) {
            static constexpr unsigned int offset_word = offset / word_bits;
            static constexpr unsigned int offset_bits = offset % word_bits;

            std::fill(res.data.begin(), res.data.begin() + offset_word, 0);
            res.data[offset_word] = data[0] << offset_bits;
            for (unsigned int i = offset_word + 1; i < size; i++) {
                res.data[i] = (data[i - offset_word] << offset_bits) | (data[i - 1 + offset_word] >> (word_bits - offset_bits));
            }

        } else if (offset < 0) {
            static constexpr unsigned int offset_word = (-offset) / word_bits;
            static constexpr unsigned int offset_bits = (-offset) % word_bits;

            for (unsigned int i = 0; i < size - 1 - offset_word; i++) {
                if (offset_bits) {
                    res.data[i] = (data[i + 1 + offset_word] << (word_bits - offset_bits)) | (data[i + offset_word] >> offset_bits);
                } else {
                    res.data[i] = data[i + offset_word];
                }
            }
            res.data[size - 1 - offset_word] = data[size - 1] >> offset_bits;
            std::fill(res.data.end() - offset_word, res.data.end(), 0);

        } else {
            res = *this;
        }

        return res;
	}

    bool has_bit() const {
        for (unsigned int i = 0; i < size; i++) {
            if (data[i]) {return true;}
        }
        return false;
    }

    struct FirstBitEater {
		unsigned int el_id = 0;
	};
    bool has_bit(FirstBitEater &eater) const {
		while (true) {
            if (data[eater.el_id] != 0) {return true;}
            if (eater.el_id == size - 1) {return false;}
            eater.el_id++;
		}
	}
    unsigned int pop_bit(FirstBitEater &eater) {
        assert(data[eater.el_id] != 0);
		unsigned int pos = __builtin_ctzll(data[eater.el_id]);
        data[eater.el_id] ^= static_cast<DataType>(1) << pos;
		return eater.el_id * word_bits + pos;
	}

    struct LastBitEater {
		unsigned int el_id = size - 1;
	};
    bool has_bit(LastBitEater &eater) const {
		while (true) {
            if (data[eater.el_id] != 0) {return true;}
			if (eater.el_id == 0) {return false;}
			eater.el_id--;
		}
	}
    unsigned int pop_bit(LastBitEater &eater) {
		assert(data[eater.el_id] != 0);
		unsigned int pos = (word_bits - 1) - __builtin_clzll(data[eater.el_id]);
        data[eater.el_id] ^= static_cast<DataType>(1) << pos;
		return eater.el_id * word_bits + pos;
	}

    typedef FirstBitEater FastBitEater;

	unsigned int count_set_bits() const {
		unsigned int res = 0;
		for (unsigned int i = 0; i < size; i++) {
			res += __builtin_popcountll(data[i]);
		}
		return res;
	}

    bool test(unsigned int pos) const {
        assert(pos < bits);
        return (data[pos / word_bits] >> (pos % word_bits)) & 1;
    }

private:
	std::array<DataType, size> data;

	template <typename... RestBitTypes>
    void set_bits(unsigned int pos, RestBitTypes ... rest) {
        assert(pos < bits);
        data[pos / word_bits] |= static_cast<DataType>(1) << (pos % word_bits);
    	set_bits(rest...);
    }
    void set_bits() {}

	template <signed int interval>
	static BitBoard<bits> make_pattern(signed int start) {
        static_assert(interval != 0, "Interval cannot be zero");

		BitBoard<bits> res;
		res.clear();

        while (start >= 0 && start < bits) {
            res.set_bits(start);
            start += interval;
        }

        return res;
	}
};
