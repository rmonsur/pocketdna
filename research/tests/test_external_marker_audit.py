"""Check that marker matching cannot silently admit ambiguous cross-panel variants."""
import unittest
from research.audit_external_markers import compare


class MarkerClassificationTests(unittest.TestCase):
    def test_direct_and_swapped(self):
        ref = ['1','rs1','0','100','A','C']
        self.assertEqual(compare(ref,['1','rs1','0','100','A','C']),'direct_same_order')
        self.assertEqual(compare(ref,['1','rs1','0','100','C','A']),'direct_swapped')

    def test_complements_are_not_direct(self):
        ref = ['1','rs1','0','100','A','C']
        self.assertEqual(compare(ref,['1','rs1','0','100','T','G']),'complement_same_order')
        self.assertEqual(compare(ref,['1','rs1','0','100','G','T']),'complement_swapped')

    def test_ambiguous_and_wrong_coordinates_are_rejected(self):
        ref = ['1','rs1','0','100','A','C']
        self.assertEqual(compare(ref,['1','rs1','0','101','A','C']),'coordinate_mismatch')
        self.assertEqual(compare(ref,['1','rs1','0','100','0','C']),'missing_or_invalid_alleles')
        self.assertEqual(compare(ref,['1','rs1','0','100','A','T']),'palindromic')
        self.assertEqual(compare(ref,['23','rs1','0','100','A','C']),'non_autosomal')
        self.assertEqual(compare(ref,['1','rs1','0','100','A','G']),'allele_mismatch')


if __name__=='__main__':unittest.main()
